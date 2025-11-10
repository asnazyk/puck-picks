// src/app/leaderboard/LeaderboardClient.tsx
"use client"

import { useMemo, useState } from "react"

type Standing = {
  user_id: string
  week_index: number
  goals: number | null
  assists?: number | null
  player_points: number | null
  total_points: number | null
  team_name?: string | null
}

type Props = {
  initialWeek: number
  initialRows: Standing[]
}

type SortKey = "total_points" | "goals" | "player_points" | "assists"
type SortDir = "desc" | "asc"

export default function LeaderboardClient({ initialWeek, initialRows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("total_points")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [filterQuery, setFilterQuery] = useState("")

  const rows = useMemo(() => {
    const q = filterQuery.trim().toLowerCase()
    const filtered = q
      ? initialRows.filter((r) => {
          const name = (r.team_name ?? r.user_id ?? "").toString().toLowerCase()
          return name.includes(q)
        })
      : initialRows

    const sorted = [...filtered].sort((a, b) => {
      const av = (a[sortKey] ?? 0) as number
      const bv = (b[sortKey] ?? 0) as number
      if (av === bv) {
        const gA = (a.goals ?? 0) as number
        const gB = (b.goals ?? 0) as number
        if (gA !== gB) return sortDir === "desc" ? gB - gA : gA - gB
        const pA = (a.player_points ?? 0) as number
        const pB = (b.player_points ?? 0) as number
        if (pA !== pB) return sortDir === "desc" ? pB - pA : pA - pB
        return String(a.user_id).localeCompare(String(b.user_id))
      }
      return sortDir === "desc" ? bv - av : av - bv
    })
    return sorted
  }, [initialRows, filterQuery, sortKey, sortDir])

  function handleHeaderClick(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortKey(nextKey)
      setSortDir("desc")
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Week {initialWeek} Standings</h2>
          <p className="text-xs text-gray-500">
            Sort by clicking column headers. Use search to find a team/user.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search team or user…"
            className="h-9 w-60 rounded-xl border px-3 text-sm outline-none transition focus:ring-2 focus:ring-black/20"
          />
          <span className="text-xs text-gray-400">
            {rows.length} {rows.length === 1 ? "result" : "results"}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-white/90 backdrop-blur">
            <tr className="[&>th]:py-3 [&>th]:px-3 [&>th]:text-left [&>th]:font-semibold">
              <th className="w-[52px]">#</th>
              <SortableTH active={sortKey === "total_points"} dir={sortDir} onClick={() => handleHeaderClick("total_points")}>
                Total Pts
              </SortableTH>
              <SortableTH active={sortKey === "goals"} dir={sortDir} onClick={() => handleHeaderClick("goals")}>
                Goals
              </SortableTH>
              <SortableTH active={sortKey === "player_points"} dir={sortDir} onClick={() => handleHeaderClick("player_points")}>
                Skater Pts
              </SortableTH>
              <SortableTH active={sortKey === "assists"} dir={sortDir} onClick={() => handleHeaderClick("assists")}>
                Assists
              </SortableTH>
              <th>Team / User</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No results for this week.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={`${r.user_id}-${idx}`} className="border-t hover:bg-gray-50/60 [&>td]:py-2.5 [&>td]:px-3">
                  <td>{idx + 1}</td>
                  <td>{r.total_points ?? 0}</td>
                  <td>{r.goals ?? 0}</td>
                  <td>{r.player_points ?? 0}</td>
                  <td>{r.assists ?? 0}</td>
                  <td>{r.team_name ?? r.user_id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Data source: Supabase `weekly_standings` (RLS public read).
      </p>
    </section>
  )
}

function SortableTH({ children, active, dir, onClick }: { children: React.ReactNode; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <th>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition hover:bg-gray-100 ${active ? "font-bold" : ""}`}
      >
        <span>{children}</span>
        <span className="text-xs opacity-70">{active ? (dir === "desc" ? "▼" : "▲") : "↕"}</span>
      </button>
    </th>
  )
}
