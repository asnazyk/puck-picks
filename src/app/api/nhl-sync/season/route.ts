export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRV = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_KEY = process.env.SPORTSDATAIO_API_KEY!;

export async function GET() {
  const supabase = createClient(SUPABASE_URL, SRV);

  try {
    // Fetch players from SportsDataIO
    const res = await fetch(
      `https://api.sportsdata.io/v3/nhl/stats/json/PlayerSeasonStatsBySeason/2025?key=${API_KEY}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "SportsDataIO request failed", status: res.status },
        { status: 500 }
      );
    }

    const players = await res.json();

    // Insert/upsert into Supabase
    const { error } = await supabase.from("nhl_player_season_stats").upsert(
      players.map((p: any) => ({
        nhl_player_id: String(p.PlayerID),
        games: p.Games ?? 0,
        goals: p.Goals ?? 0,
        assists: p.Assists ?? 0,
        points: p.Points ?? 0,
        pim: p.PenaltyMinutes ?? 0,
        shots: p.ShotsOnGoal ?? 0,
        plusminus: p.PlusMinus ?? 0,
        updated_at: new Date().toISOString()
      })),
      { onConflict: "nhl_player_id" }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, count: players.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
