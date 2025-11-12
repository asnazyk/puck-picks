import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SPORTSDATAIO_API_KEY = process.env.SPORTSDATAIO_API_KEY!;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SPORTSDATAIO_API_KEY) {
    return NextResponse.json(
      { error: "Missing environment variables." },
      { status: 500 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Step 1: Get player IDs from your table
    const { data: players, error: fetchError } = await supabase
      .from("pp_players")
      .select("player_id, full_name");

    if (fetchError) throw fetchError;

    if (!players?.length) {
      return NextResponse.json({ message: "No players found." });
    }

    // Step 2: Fetch stats from SportsDataIO
    const res = await fetch(
      `https://api.sportsdata.io/v3/nhl/stats/json/PlayerSeasonStats/2025`,
      { headers: { "Ocp-Apim-Subscription-Key": SPORTSDATAIO_API_KEY } }
    );

    if (!res.ok) throw new Error(`SportsDataIO error ${res.status}`);
    const stats = await res.json();

    // Step 3: Match players and prepare updates
    const updates = [];
    for (const player of players) {
      const stat = stats.find((s: any) => String(s.PlayerID) === String(player.player_id));
      if (stat) {
        updates.push({
          player_id: player.player_id,
          goals: stat.Goals ?? 0,
          assists: stat.Assists ?? 0,
          points: (stat.Goals ?? 0) + (stat.Assists ?? 0),
        });
      }
    }

    // Step 4: Bulk update Supabase
    for (const u of updates) {
      await supabase
        .from("pp_players")
        .update({
          goals: u.goals,
          assists: u.assists,
          total_points: u.points,
        })
        .eq("player_id", u.player_id);
    }

    return NextResponse.json({
      ok: true,
      updated: updates.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
