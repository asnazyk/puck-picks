export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRV = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_KEY = process.env.SPORTSDATAIO_API_KEY!;

// Force any incoming value into a safe integer (no decimals, no NaN)
function toInt(v: any): number {
  const n = parseInt(String(v ?? "0"), 10);
  if (Number.isNaN(n)) return 0;
  return n;
}

export async function GET() {
  const supabase = createClient(SUPABASE_URL, SRV);

  try {
    // Season stats endpoint
    const url = `https://api.sportsdata.io/v3/nhl/stats/json/PlayerSeasonStats/2025?key=${API_KEY}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { error: "SportsDataIO request failed", status: res.status },
        { status: res.status }
      );
    }

    const players = await res.json();

    const formatted = players.map((p: any) => ({
      nhl_player_id: String(p.PlayerID),
      // All numeric fields sanitized to plain integers
      games: toInt(p.Games),
      goals: toInt(p.Goals),
      assists: toInt(p.Assists),
      pim: toInt(p.PenaltyMinutes),
      shots: toInt(p.ShotsOnGoal),
      plusminus: toInt(p.PlusMinus),
      // DO NOT send "points" – it's a generated column in your DB
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from("nhl_player_season_stats")
      .upsert(formatted, { onConflict: "nhl_player_id" });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, count: formatted.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
