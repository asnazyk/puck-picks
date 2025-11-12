// src/app/api/nhl-sync/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRV = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SPORTSDATAIO_API_KEY = process.env.SPORTSDATAIO_API_KEY!;

// SportsDataIO uses "2025" for the 2024-25 NHL season
const SEASON = "2025";

export async function GET() {
  if (!SUPABASE_URL || !SRV || !SPORTSDATAIO_API_KEY) {
    return NextResponse.json(
      { error: "Missing envs" },
      { status: 500 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SRV);

  try {
    // 1) Get players that have an NHL PlayerID mapped
    const { data: players, error: pErr } = await supabase
      .from("pp_players")
      .select("player_id, full_name, nhl_player_id")
      .not("nhl_player_id", "is", null);

    if (pErr) throw pErr;
    if (!players || players.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, note: "No players with nhl_player_id" });
    }

    // 2) Fetch season stats from SportsDataIO
    const res = await fetch(
      `https://api.sportsdata.io/v3/nhl/stats/json/PlayerSeasonStats/${SEASON}`,
      { headers: { "Ocp-Apim-Subscription-Key": SPORTSDATAIO_API_KEY } }
    );
    if (!res.ok) throw new Error(`SportsDataIO error ${res.status}`);
    const allStats: any[] = await res.json();

    // Build a quick index by PlayerID for O(1) lookups
    const byId = new Map<string, any>();
    for (const s of allStats) {
      if (s && s.PlayerID != null) byId.set(String(s.PlayerID), s);
    }

    // 3) Prepare updates by matching nhl_player_id -> PlayerID
    const updates: { player_id: string; goals: number; assists: number; total_points: number }[] = [];
    let unmatched = 0;

    for (const row of players) {
      const key = String(row.nhl_player_id);
      const stat = byId.get(key);
      if (!stat) {
        unmatched++;
        continue;
      }
      const goals = Number(stat.Goals ?? 0);
      const assists = Number(stat.Assists ?? 0);
      updates.push({
        player_id: row.player_id,
        goals,
        assists,
        total_points: goals + assists,
      });
    }

    // 4) Persist to pp_players (assumes columns exist)
    let updated = 0;
    for (const u of updates) {
      const { error: uErr } = await supabase
        .from("pp_players")
        .update({
          goals: u.goals,
          assists: u.assists,
          total_points: u.total_points,
        })
        .eq("player_id", u.player_id);
      if (!uErr) updated++;
    }

    return NextResponse.json({ ok: true, updated, unmatched, scanned: players.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "unknown error" }, { status: 500 });
  }
}
