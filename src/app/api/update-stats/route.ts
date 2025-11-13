export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const BASE_URL =
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || "https://puck-picks.vercel.app";

export async function GET() {
  try {
    // Hit the season sync route in the same deployment
    const seasonRes = await fetch(`${BASE_URL}/api/nhl-sync/season`, {
      cache: "no-store",
    });

    const seasonJson = await seasonRes.json();

    if (!seasonRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Season sync failed",
          season: seasonJson,
        },
        { status: 500 }
      );
    }

    // In the future we can add weekly sync here too
    return NextResponse.json({
      ok: true,
      season: seasonJson,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unexpected error in /api/update-stats",
      },
      { status: 500 }
    );
  }
}
