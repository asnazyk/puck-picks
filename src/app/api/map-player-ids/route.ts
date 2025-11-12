export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SRV = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const SPORTSDATAIO_API_KEY = process.env.SPORTSDATAIO_API_KEY as string;

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function nameTokens(s: string) {
  const t = norm(s).split(" ").filter(Boolean);
  return t.length ? t : [norm(s)];
}
function scoreNameMatch(a: string, b: string) {
  const A = new Set(nameTokens(a));
  const B = new Set(nameTokens(b));
  let inter = 0;
  A.forEach((t) => { if (B.has(t)) inter++; });
  const union = new Set([...A, ...B]).size || 1;
  return inter / union;
}

export async function GET() {
  // Fast “version” ping to prove which code is live
  // e.g. /api/map-player-ids?ping=1
  const url = new URL(globalThis.location?.href ?? "http://local");
  if (url.searchParams.get("ping")) {
    return new Response(JSON.stringify({ ok: true, version: "mapper_v2_update_only" }), {
      headers: { "content-type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SRV || !SPORTSDATAIO_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing envs" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SRV);

  try {
    // Only UPDATE rows that lack an nhl_player_id. NO UPSERT/INSERT.
    const need = await supabase
      .from("pp_players")
      .select("player_id, full_name")
      .is("nhl_player_id", null);

    if (need.error) {
      return new Response(JSON.stringify({ error: need.error.message, version: "mapper_v2_update_only" }), {
        status: 500, headers: { "content-type": "application/json" },
      });
    }
    const rows = need.data || [];
    if (!rows.length) {
      return new Response(JSON.stringify({ ok: true, updated: 0, note: "No players need IDs", version: "mapper_v2_update_only" }), {
        headers: { "content-type": "application/json" },
      });
    }

    // Pull SportsDataIO player directory once
    const resp = await fetch(
      "https://api.sportsdata.io/v3/nhl/scores/json/Players?key=" +
        encodeURIComponent(SPORTSDATAIO_API_KEY),
      { cache: "no-store" }
    );
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "SportsDataIO error " + resp.status, version: "mapper_v2_update_only" }), {
        status: 502, headers: { "content-type": "application/json" },
      });
    }
    const sd: any[] = await resp.json();

    const byLast = new Map<string, any[]>();
    for (const p of sd) {
      const ln = norm(p?.LastName || "");
      if (!byLast.has(ln)) byLast.set(ln, []);
      byLast.get(ln)!.push(p);
    }

    let updated = 0;
    const review: any[] = [];

    for (const r of rows) {
      const full = r.full_name || r.player_id;
      const toks = nameTokens(full);
      const last = toks[toks.length - 1];
      const candidates = byLast.get(last) || [];

      let best: any = null;
      let bestScore = -1;

      const scan = (arr: any[]) => {
        for (const c of arr) {
          const cand =
            c?.CommonName && c.CommonName.length
              ? c.CommonName
              : `${c?.FirstName || ""} ${c?.LastName || ""}`.trim();
          const s = scoreNameMatch(full, cand);
          if (s > bestScore) { best = c; bestScore = s; }
        }
      };

      if (candidates.length) scan(candidates);
      if (!best && sd.length) scan(sd);

      if (best && bestScore >= 0.6) {
        // UPDATE ONLY (no upsert or insert)
        const { error } = await supabase
          .from("pp_players")
          .update({ nhl_player_id: String(best.PlayerID) })
          .eq("player_id", r.player_id);

        if (!error) updated++;

        review.push({
          player_id: r.player_id,
          full_name: full,
          matched_name: `${best?.FirstName || ""} ${best?.LastName || ""}`.trim(),
          nhl_player_id: best?.PlayerID ?? null,
          team: best?.Team ?? null,
          pos: best?.Position ?? null,
          score: Number(bestScore.toFixed(2)),
          saved: !error,
          err: error?.message || null,
        });
      } else {
        review.push({
          player_id: r.player_id,
          full_name: full,
          matched_name: null,
          nhl_player_id: null,
          team: null,
          pos: null,
          score: Number(bestScore.toFixed(2)),
          saved: false,
          err: null,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, updated, version: "mapper_v2_update_only", review }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown error", version: "mapper_v2_update_only" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
}
