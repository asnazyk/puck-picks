// src/app/api/update-today/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";  // never cache this route
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SPORTSDATAIO_API_KEY = process.env.SPORTDATAIO_API_KEY;

function ymdUTC(d = new Date()) {
  const u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const yyyy = u.getUTCFullYear();
  const mm = String(u.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(u.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Thu-based week index (Thu–Sun window)
function weekIndexFromThu(d = new Date()) {
  const base = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const toFirstThu = ((4 - base.getUTCDay()) + 7) % 7;
  const firstThu = new Date(base);
  firstThu.setUTCDate(base.getUTCDate() + toFirstThu);

  const thisThu = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = thisThu.getUTCDay();
  const toThu = ((4 - dow) + 7) % 7;
  thisThu.setUTCDate(thisThu.getUTCDate() + toThu);

  return Math.floor((thisThu.getTime() - firstThu.getTime()) / (7 * 24 * 3600 * 1000)) + 1;
}

// small guard to avoid a hanging fetch
async function fetchWithTimeout(url: string, ms = 15000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { cache: "no-store", signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function GET() {
  try {
    // Env guard with helpful output
    const missing: string[] = [];
    if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!SPORTSDATAIO_API_KEY) missing.push("SPORTSDATAIO_API_KEY");
    if (missing.length) {
      return NextResponse.json(
        { ok: false, error: `Missing env vars: ${missing.join(", ")}` },
        { status: 500 }
      );
    }

    // Only run on Thu–Sun to conserve calls
    const dow = new Date().getUTCDay(); // 0 Sun, 4 Thu, 5 Fri, 6 Sat
    if (![4, 5, 6, 0].includes(dow)) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Mon–Wed" });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const today = ymdUTC();
    const url = `https://api.sportsdata.io/v3/nhl/stats/json/PlayerGameStatsByDate/${today}?key=${SPORTSDATAIO_API_KEY}`;
    const r = await fetchWithTimeout(url);
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `SportsDataIO ${r.status} ${t}` },
        { status: 502 }
      );
    }
    const stats: any[] = await r.json();

    const { data: players, error: pErr } = await supabase
      .from("players")
      .select("id,name,sportdataio_player_id");
    if (pErr) throw pErr;

    // Build quick lookup for today’s goals/assists by id and name
    const map = new Map<string, { g: number; a: number }>();
    for (const s of stats) {
      const g = Number(s?.Goals || 0) || 0;
      const a = Number(s?.Assists || 0) || 0;
      if (!g && !a) continue;

      const pid = typeof s?.PlayerID === "number" ? `id:${s.PlayerID}` : undefined;
      const nm = (s?.Name ? String(s.Name) : "").trim().toLowerCase();

      if (pid) {
        const v = map.get(pid) || { g: 0, a: 0 };
        v.g += g; v.a += a; map.set(pid, v);
      }
      if (nm) {
        const v = map.get(nm) || { g: 0, a: 0 };
        v.g += g; v.a += a; map.set(nm, v);
      }
    }

    const week = weekIndexFromThu(new Date());
    const upserts: { player_id: string; week: number; goals: number; assists: number }[] = [];

    for (const p of players || []) {
      let g = 0, a = 0;
      if (p.sportdataio_player_id) {
        const hit = map.get(`id:${p.sportdataio_player_id}`);
        if (hit) { g += hit.g; a += hit.a; }
      }
      if (g === 0 && a === 0 && p.name) {
        const hit = map.get(String(p.name).trim().toLowerCase());
        if (hit) { g += hit.g; a += hit.a; }
      }
      if (g || a) {
        upserts.push({ player_id: String(p.id), week, goals: g, assists: a });
      }
    }

    if (upserts.length) {
      const { error } = await supabase
        .from("weekly_player_stats")
        .upsert(upserts, { onConflict: "player_id,week" });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, date: today, week, updated: upserts.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
