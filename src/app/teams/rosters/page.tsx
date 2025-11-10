// src/app/teams/rosters/page.tsx
type PlayerRow = {
  player_id: string
  full_name: string
  position: string | null
  team_abbr: string | null
}

type RosterJoin = {
  user_id: string
  player_id: string
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function fetchRosters(): Promise<RosterJoin[]> {
  const url = `${SUPA_URL}/rest/v1/team_rosters?select=user_id,player_id&active=eq.true`
  const res = await fetch(url, {
    headers: { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}` },
    cache: "no-store",
  })
  if (!res.ok) {
    console.error("Failed to fetch team_rosters:", await res.text())
    return []
  }
  return (await res.json()) as RosterJoin[]
}

async function fetchPlayersByIds(ids: string[]): Promise<Record<string, PlayerRow>> {
  if (ids.length === 0) return {}
  const chunkSize = 200
  const out: Record<string, PlayerRow> = {}
  for (let i = 0; i < ids.length; i += chunkSize) {
    const subset = ids.slice(i, i + chunkSize)
    const inList = "(" + subset.map((id) => `"${id.replace(/"/g, '""')}"`).join(",") + ")"
    const url = `${SUPA_URL}/rest/v1/players?select=player_id,full_name,position,team_abbr&player_id=in.${encodeURIComponent(inList)}`
    const res = await fetch(url, {
      headers: { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}` },
      cache: "no-store",
    })
    if (!res.ok) {
      console.error("Failed to fetch players:", await res.text())
      continue
    }
    const rows = (await res.json()) as PlayerRow[]
    rows.forEach((r) => (out[r.player_id] = r))
  }
  return out
}

// Optional: map known UUIDs to friendly names
const USER_NAME_MAP: Record<string, string> = {
  "933348f1-4b21-406b-84dc-7be353b6ae95": "Andy",
}

export default async function TeamsRostersPage() {
  const roster = await fetchRosters()

  const byUser: Record<string, string[]> = {}
  for (const row of roster) {
    if (!byUser[row.user_id]) byUser[row.user_id] = []
    byUser[row.user_id].push(row.player_id)
  }

  const allIds = Array.from(new Set(roster.map((r) => r.player_id)))
  const playersById = await fetchPlayersByIds(allIds)

  const userBlocks = Object.entries(byUser).map(([userId, pids]) => {
    const displayName = USER_NAME_MAP[userId] || userId
    const playerRows = pids
      .map((pid) => playersById[pid])
      .filter(Boolean)
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
    return { userId, displayName, playerRows }
  })

  userBlocks.sort((a, b) => a.displayName.localeCompare(b.displayName))

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Rosters</h1>
          <p className="text-sm text-gray-500">Drafted rosters (active)</p>
        </div>
        <a href="/teams" className="text-sm underline underline-offset-4 hover:opacity-80">
          ← Back to Teams
        </a>
      </header>

      {userBlocks.length === 0 ? (
        <div className="rounded-xl border p-6 text-sm text-gray-600">
          No active rosters found. Once you insert rows into <code>team_rosters</code>, they will appear here automatically.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {userBlocks.map(({ userId, displayName, playerRows }) => (
            <section key={userId} className="rounded-2xl border shadow-sm">
              <div className="border-b px-4 py-3">
                <h2 className="truncate text-lg font-semibold">{displayName}</h2>
                <p className="text-xs text-gray-500">{userId}</p>
              </div>
              <ul className="divide-y">
                {playerRows.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-gray-500">No active players</li>
                ) : (
                  playerRows.map((p) => (
                    <li key={p.player_id} className="px-4 py-2.5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">{p.full_name}</span>
                        <span className="shrink-0 tabular-nums text-gray-500">
                          {p.position ?? "-"} {p.team_abbr ? `· ${p.team_abbr}` : ""}
                        </span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
