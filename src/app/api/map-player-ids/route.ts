// src/app/api/map-player-ids/route.ts
// Run on Node.js so env vars are available; never prerender
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

/**
 * REQUIRED ENV VARS (set in Vercel + .env.local):
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *  - SPORTSDATAIO_API_KEY
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SRV = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const SPORTSDATAIO_API_KEY = process.env.SPORTSDATAIO_API_KEY as string;

// ---- tiny helpers (no fancy TS) ----
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
  A.forEach((t) => {
    if (B.has(t)) inter++;
  });
  const union = new Set([...Array.from(A), ...Array.from(B)]).size || 1;
  return inter / union; // 0..1
}

export async function GET() {
  // 0) env guard
  if (!SUPABASE_URL || !SRV || !SPORTSDATAIO_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "Missing envs: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SPORTSDATAIO_API_KEY",
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(SUPABASE_URL, SRV);

    // 1) players missing IDs
    const need = await supabase
      .from("pp_players")
      .select("player_id, full_name, nhl_player_id")
      .is("nhl_player_id", null);

    if (need.error) {
      return new Response(JSON.stringify({ error: need.error.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const needIds = need.data || [];
    if (!needIds.length) {
      return new Response(
        JSON.stringify({ ok: true, updated: 0, note: "No players need IDs" }),
        { headers: { "content-type": "application/json" } }
      );
    }

    // 2) fetch SportsDataIO players directory
    const url =
      "https://api.sportsdata.io/v3/nhl/scores/json/Players?key=" +
      encodeURIComponent(SPORTSDATAIO_API_KEY);
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: "SportsDataIO error " + String(resp.status) }),
        { status: 502, headers: { "content-type": "application/json" } }
      );
    }
    const sdPlayers: any[] = await resp.json();

    // index by last name
    const byLast = new Map<string, any[]>();
    for (const p of sdPlayers) {
      const last = norm(p?.LastName || "");
      if (!byLast.has(last)) byLast.set(last, []);
      byLast.get(last)!.push(p);
    }

    // 3) match and collect updates
    const updates: { player_id: string; nhl_player_id: string }[] = [];
    const review: any[] = [];

    for (const row of needIds) {
      const full = row.full_name || row.player_id;
      const toks = nameTokens(full);
      const last = toks[toks.length - 1];
      const candidates = byLast.get(last) || [];

      let best: any = null;
      let bestScore = -1;

      const scan = (list: any[]) => {
        for (const c of list) {
          const cand =
            c?.CommonName && c.CommonName.length > 0
              ? c.CommonName
              : ((c?.FirstName || "") + " " + (c?.LastName || "")).trim();
          const s = scoreNameMatch(full, cand);
          if (s > bestScore) {
            best = c;
            bestScore = s;
          }
        }
      };

      if (candidates.length) scan(candidates); // last-name bucket first
      if (!best && sdPlayers.length) scan(sdPlayers); // fallback global

      if (best && bestScore >= 0.6) {
        updates.push({
          player_id: row.player_id,
          nhl_player_id: String(best.PlayerID),
        });
        review.push({
          player_id: row.player_id,
          full_name: full,
          matched_name: ((best?.FirstName || "") + " " + (best?.LastName || "")).trim(),
          playerId: best?.PlayerID ?? null,
          team: best?.Team ?? null,
          pos: best?.Position ?? null,
          score: Number(bestScore.toFixed(2)),
        });
      } else {
        review.push({
          player_id: row.player_id,
          full_name: full,
          matched_name: null,
          playerId: null,
          team: null,
          pos: null,
          score: Number(bestScore.toFixed(2)),
        });
      }
    }

    // 4) upsert updates
    if (updates.length) {
      const up = await supabase
        .from("pp_players")
        .upsert(updates, { onConflict: "player_id" });
      if (up.error) {
        return new Response(JSON.stringify({ error: up.error.message, review }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, updated: updates.length, review }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (err: any) {
    const msg = err && err.message ? String(err.message) : "unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
