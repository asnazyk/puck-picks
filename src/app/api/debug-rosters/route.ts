import { NextResponse } from "next/server"

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  const headers = { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}` }

  try {
    // 1) rosters
    const r1 = await fetch(
      `${SUPA_URL}/rest/v1/pp_team_rosters?select=user_id,player_id,active&active=eq.true`,
      { headers, cache: "no-store" }
    )
    const rostersText = await r1.text()
    let rosters: any
    try { rosters = JSON.parse(rostersText) } catch { rosters = rostersText }

    // 2) players
    const r2 = await fetch(
      `${SUPA_URL}/rest/v1/pp_players?select=player_id,full_name,position,team_abbr`,
      { headers, cache: "no-store" }
    )
    const playersText = await r2.text()
    let players: any
    try { players = JSON.parse(playersText) } catch { players = playersText }

    // 3) users_public
    const r3 = await fetch(
      `${SUPA_URL}/rest/v1/users_public?select=user_id,display_name`,
      { headers, cache: "no-store" }
    )
    const usersText = await r3.text()
    let users: any
    try { users = JSON.parse(usersText) } catch { users = usersText }

    return NextResponse.json({
      env: {
        NEXT_PUBLIC_SUPABASE_URL: !!SUPA_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!SUPA_ANON,
      },
      endpoints: {
        rosters: { ok: r1.ok, status: r1.status, sample: rosters },
        players: { ok: r2.ok, status: r2.status, sample: players },
        users_public: { ok: r3.ok, status: r3.status, sample: users },
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    )
  }
}
