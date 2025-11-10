'use client';
import { useCallback, useEffect, useState } from 'react';
import RealtimeWeeklyStandings from './components/RealtimeWeeklyStandings';
import { fetchWeeklyStandings } from './lib/standings';

type Row = {
  week_index: number; user_id: string; goals: number; assists: number;
  player_points: number; pick_points: number; total_points: number; updated_at: string;
};

export default function StandingsClient({ weekIndex }: { weekIndex: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await fetchWeeklyStandings(weekIndex);
    setRows(data as Row[]);
    setLoading(false);
  }, [weekIndex]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  return (
    <>
      <RealtimeWeeklyStandings weekIndex={weekIndex} onInvalidate={load} />
      {loading ? <p>Loading…</p> :
        <div className="grid gap-2">
          {rows.map(r => (
            <div key={`${r.week_index}-${r.user_id}`} className="border rounded p-3 flex justify-between">
              <div>
                <div className="font-semibold">User: {r.user_id.slice(0,8)}…</div>
                <div className="text-sm opacity-70">G {r.goals} • A {r.assists}</div>
              </div>
              <div className="text-right">
                <div className="text-sm">Players: {r.player_points}</div>
                <div className="text-sm">Picks: {r.pick_points}</div>
                <div className="text-xl font-bold">Total: {r.total_points}</div>
              </div>
            </div>
          ))}
        </div>}
    </>
  );
}
