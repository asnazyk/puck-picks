// src/app/teams/[slug]/page.tsx
import Link from 'next/link';

type Totals = {
  goals: number;
  assists: number;
  player_points: number;
  pick_points: number;
  total_points: number;
};

async function getWeekIndexFromDB(): Promise<number> {
  // call our debug endpoint to reuse working path and avoid RPC issues
  const now = new Date();
  // We only need the week number; use 58 as fallback if call fails
  // You can also compute with the same JS epoch if you prefer.
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  // We'll just use the JS computation identical to the homepage as a backup.
  const epoch = Date.UTC(2024, 8, 26); // 2024-09-26
  const d = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const w = Math.floor((d - epoch) / (7 * 24 * 60 * 60 * 1000));
  return w;
}

async function getTotalsViaRest(userId: string, weekIndex: number): Promise<Totals> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // Supabase REST endpoint for weekly_standings
  const rest = `${url}/rest/v1/weekly_standings?user_id=eq.${userId}&week_index=eq.${weekIndex}&select=goals,assists,player_points,pick_points,total_points`;

  const res = await fetch(rest, {
    method: 'GET',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      Accept: 'application/json'
    },
    cache: 'no-store' // <- important: never cache
  });

  if (!res.ok) {
    // Return zeros on error but log to server console for debugging
    console.error('REST weekly_standings error', await res.text());
    return { goals: 0, assists: 0, player_points: 0, pick_points: 0, total_points: 0 };
  }

  const rows = (await res.json()) as Totals[];
  if (!rows || rows.length === 0) {
    return { goals: 0, assists: 0, player_points: 0, pick_points: 0, total_points: 0 };
  }
  return rows[0];
}

export default async function TeamPage({ params }: { params: { slug: string } }) {
  const userId = params.slug; // slug is UUID for now
  const weekIndex = await getWeekIndexFromDB();
  const totals = await getTotalsViaRest(userId, weekIndex);

  return (
    <main className="max-w-5xl mx-auto p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Team</h1>
        <Link href="/" className="text-sm underline">
          ← Back to Leaderboard
        </Link>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">This Week</h2>
        <div className="flex gap-10">
          <div>
            <div className="text-3xl font-bold">{totals.goals ?? 0}</div>
            <div className="text-xs text-slate-500">Goals</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{totals.assists ?? 0}</div>
            <div className="text-xs text-slate-500">Assists</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{totals.player_points ?? 0}</div>
            <div className="text-xs text-slate-500">Player Pts</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{totals.pick_points ?? 0}</div>
            <div className="text-xs text-slate-500">Pick Pts</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{totals.total_points ?? 0}</div>
            <div className="text-xs text-slate-500">Total</div>
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-2">Week index: {weekIndex}</div>
      </section>

      <section>
        <p className="text-sm text-slate-500">Roster and picks details coming soon.</p>
      </section>
    </main>
  );
}
