'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type RosterRow = {
  user_id: string;
  manager_name: string;
  player_id: number;
  player: {
    nhl_player_id: string;
    full_name: string;
    position: string;
    team: string;
  };
  season_stats: {
    games: number | null;
    goals: number | null;
    assists: number | null;
    points: number | null;
    pim: number | null;
    shots: number | null;
    plusminus: number | null;
  } | null;
};

export default function TeamsPage() {
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('v_pp_rosters_ytd')
        .select('*')
        .order('manager_name', { ascending: true });

      if (!error && data) {
        setRows(data as any);
      }

      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-white text-xl">
        Loading team rosters…
      </div>
    );
  }

  // Group players by manager
  const managers: Record<string, RosterRow[]> = {};
  rows.forEach((row) => {
    if (!managers[row.manager_name]) managers[row.manager_name] = [];
    managers[row.manager_name].push(row);
  });

  return (
    <div className="p-8 text-white">
      <h1 className="text-4xl font-bold mb-8">Teams</h1>

      <div className="space-y-10">
        {Object.entries(managers).map(([manager, players]) => (
          <div key={manager} className="bg-[#111] p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-2xl mb-4 font-semibold">{manager}</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="py-2">Player</th>
                  <th className="py-2">Team</th>
                  <th className="py-2">Pos</th>
                  <th className="py-2 text-right">G</th>
                  <th className="py-2 text-right">A</th>
                  <th className="py-2 text-right">PTS</th>
                  <th className="py-2 text-right">GP</th>
                </tr>
              </thead>
              <tbody>
                {players.map((row) => {
                  const stats = row.season_stats || {
                    goals: 0,
                    assists: 0,
                    points: 0,
                    games: 0
                  };

                  return (
                    <tr key={row.player_id} className="border-b border-gray-800">
                      <td className="py-2">{row.player.full_name}</td>
                      <td>{row.player.team}</td>
                      <td>{row.player.position}</td>
                      <td className="text-right">{stats.goals ?? 0}</td>
                      <td className="text-right">{stats.assists ?? 0}</td>
                      <td className="text-right">{stats.points ?? 0}</td>
                      <td className="text-right">{stats.games ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
