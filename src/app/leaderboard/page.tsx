// src/app/leaderboard/page.tsx
import LeaderboardClient from "./LeaderboardClient"

type Standing = {
  user_id: string
  week_index: number
  goals: number | null
  assists?: number | null
  player_points: number | null
  total_points: number | null
  team_name?: string | null
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function fetchCurrentWeek(): Promise<number> {
  const url = new URL(`${SUPA_URL}/rest/v1/weekly_standings`)
  url.searchParams.set("select", "week_index")
  url.searchParams.set("order", "week_index.desc")
  url.searchParams.set("limit", "1")

  const res = await fetch(url.toString(), {
    headers: { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}` },
    cache: "no-store",
  })

  if (!res.ok) return 58
  const rows: { week_index: number }[] = await res.json()
  return rows?.[0]?.week_index ?? 58
}

async function fetchWeekStandings(weekIndex: number): Promise<Standing[]> {
  const url = new URL(`${SUPA_URL}/rest/v1/weekly_standings`)
  url.searchParams.set("week_index", `eq.${weekIndex}`)
  url.searchParams.set("select", "*")
  url.searchParams.append("order", "total_points.desc")
  url.searchParams.append("order", "goals.desc")

  const res = await fetch(url.toString(), {
    headers: { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}` },
    cache: "no-store",
  })

  if (!res.ok) return []
  return (await res.json()) as Standing[]
}

export default async function LeaderboardPage() {
  const week = await fetchCurrentWeek()
  const standings = await fetchWeekStandings(week)

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-sm text-gray-500">Week {week}</p>
        </div>
        <a href="/" className="text-sm underline hover:opacity-80">
          ← Back to Home
        </a>
      </header>
      <LeaderboardClient initialWeek={week} initialRows={standings} />
    </main>
  )
}
