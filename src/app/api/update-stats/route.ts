import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SPORTDATAIO_API_KEY = process.env.SPORTDATAIO_API_KEY!;

/** League week: Thursday → Sunday window, returns { weekIndex, dates[] } for the window that contains "now". */
function getThuSunWindow(now = new Date()) {
  // Convert to UTC date (stable)
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // JS getUTCDay(): Sun=0..Sat=6
  const dow = d.getUTCDay();
  // Find Thursday of current week (Thu=4)
  const offsetToThu = ((4 - dow) + 7) % 7; // days forward to Thursday
  const thu = new Date(d);
  thu.setUTCDate(d.getUTCDate() + offsetToThu);

  // Window is Thu..Sun (4 days)
  const dates: string[] = [];
  for (let i = 0; i < 4; i++) {
    const dd = new Date(thu);
    dd.setUTCDate(thu.getUTCDate() + i);
    const yyyy = dd.getUTCFullYear();
    const mm = String(dd.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dd.getUTCDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${day}`);
  }

  // A stable "league week index": number of Thursdays since season start anchor.
  // Simple anchor: first Thursday of the current NHL season (customize as needed).
  // For now, compute relative to the year start's first Thursday:
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const yDow = yearStart.getUTCDay();
  const toFirstThu = ((4 - yDow) + 7) % 7;
  const firstThu = new Date(yearStart);
  firstThu.setUTCDate(yearStart.getUTCDate() + toFirstThu);
  const weekIndex = Math.floor((thu.getTime() - firstThu.getTime()) / (7 * 24 * 3600 * 1000)) + 1;

  return { weekIndex, dates };
}

export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SPORTDATAIO_API_KEY) {
      return NextResponse.json({ ok: false, error: "Missing env vars" }, { status: 500 });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Load players we track
    const { data: players, error: pErr } = await supabase
      .from("players")
      .select("id, name, sportdataio_player_id");
    if (pErr) throw pErr;

    // Build quick maps
    const byId = new Map<number, any>();
    const byName = new Map<string, any[]>();

    // Aggregate goals/assists over Thu..Sun
    const { weekIndex, dates } = getThuSunWindow(new Date());
    let fetched = 0;
    const aggregate = new Map<string, { goals: number; assists: number }>(); // key=player name (lower) or sd id string

    for (const date of dates) {
      const url = `https://api.sportsdata.io/v3/nhl/stats/json/PlayerGameStatsByDate/${date}?key=${SPORTDATAIO_API_KEY}`;
      const resp = await fetch(url, { cache: "no-store" });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`SportDataIO ${date} failed: ${resp.status} ${t}`);
      }
      const rows: any[] = await resp.json();
      fetched += rows.length;
      for (const s of rows) {
        const kId = typeof s?.PlayerID === "number" ? `id:${s.PlayerID}` : null;
        const kName = (s?.Name || "").trim().toLowerCase();
        const goals = Number(s?.Goals || 0);
        const assists = Number(s?.Assists || 0);
        if (kId) {
          const prev = aggregate.get(kId) || { goals: 0, assists: 0 };
          prev.goals += goals;
          prev.assists += assists;
          aggregate.set(kId, prev);
        }
        if (kName) {
          const prev = aggregate.get(kName) || { goals: 0, assists: 0 };
          prev.goals += goals;
          prev.assists += assists;
          aggregate.set(kName, prev);
        }
      }
    }

    // Build upserts per player
    const upserts: { player_id: string; week: number; goals: number; assists: number }[] = [];
    for (const p of players || []) {
      let g = 0, a = 0;
      if (p.sportdataio_player_id) {
        const hit = aggregate.get(`id:${p.sportdataio_player_id}`);
        if (hit) { g += hit.goals; a += hit.assists; }
      } else if (p.name) {
        const hit = aggregate.get(p.name.trim().toLowerCase());
        if (hit) { g += hit.goals; a += hit.assists; }
      }
      if (g || a) {
        upserts.push({ player_id: p.id, week: weekIndex, goals: g, assists: a });
      }
    }

    if (upserts.length) {
      const { error: upErr } = await supabase
        .from("weekly_player_stats")
        .upsert(upserts, { onConflict: "player_id,week" });
      if (upErr) throw upErr;
    }

    return NextResponse.json({ ok: true, week: weekIndex, dates, fetched, updated: upserts.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
