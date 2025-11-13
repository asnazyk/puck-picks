'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type SeasonStats = {
  [key: string]: any;
};

type PlayerJson = {
  nhl_player_id: string;
  full_name: string;
  [key: string]: any;
};

type RosterRow = {
  user_id: string;
  manager_name: string;
  player_id: number;
  player: PlayerJson;
  season_stats: SeasonStats | null;
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

  const managers: Record<string, RosterRow[]> = {};
  rows.forEach((row) => {
    if (!managers[row.manager_name]) managers[row.manager_name] = [];
    managers[row.manager_name].push(row);
  });

  return (
    <div className="p-8 text-white">
      <h1 className="text-4xl font-bold mb-8">TEAMS</h1>

      <div className="space-y-10">
        {Object.entries(managers).map(([manager, players]) => (
          <div
            key={manager}
            className="bg-[#111] p-6 rounded-xl shadow-lg border border-gray-700"
          >
            <h2 className="text-2xl mb-4 font-semibold">{manager}</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="py-2">Player</th>
                  <th className="py-2 text-right">G</th>
                  <th className="py-2 text-right">A</th>
                  <th className="py-2 text-right">PTS</th>
                  <th className="py-2 text-right">GP</th>
                </tr>
              </thead>
              <tbody>
                {players.map((row) => {
                  const stats: SeasonStats = row.season_stats || {};

                  const goals =
                    stats.goals ??
                    stats.Goals ??
                    0;

                  const assists =
                    stats.assists ??
                    stats.Assists ??
                    0;

                  const points =
                    stats.points ??
                    stats.Points ??
                    goals + assists;

                  const games =
                    stats.games ??
                    stats.Games ??
                    0;

                  // TEAM + POSITION DISPLAY driven from season_stats
                  const teamRaw = (stats.team ?? stats.Team ?? '').toString().trim();
                  const teamAbbr = teamRaw
                    ? teamRaw.slice(0, 3).toUpperCase()
                    : '---';

                  const posRaw = (stats.position ?? stats.Position ?? '').toString().toUpperCase();
                  const posShort = posRaw.startsWith('D') ? 'D' : 'F';

                  const displayName = `${row.player.full_name} (${teamAbbr}, ${posShort})`;

                  return (
                    <tr key={row.player_id} className="border-b border-gray-800">
                      <td className="py-2">
                        {displayName}
                      </td>
                      <td className="text-right">{goals}</td>
                      <td className="text-right">{assists}</td>
                      <td className="text-right">{points}</td>
                      <td className="text-right">{games}</td>
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
