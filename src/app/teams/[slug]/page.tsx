// src/app/teams/[slug]/page.tsx
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

type Totals = {
  goals: number;
  assists: number;
  player_points: number;
  pick_points: number;
  total_points: number;
};

// Get a Supabase client using public anon credentials (server-side is fine).
function supa() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Always get the CURRENT week index from Postgres to match backend logic.
// (Uses your existing function: week_index_for_date(date))
async function getCurrentWeekFromDB(): Promise<number> {
  const s = supa();
  // Call as RPC with today's UTC date (YYYY-MM-DD)
  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(today.getUTCDate()).padStart(2, '0');
  const isoDate = `${yyyy}-${mm}-${dd}`;

  const { data, error } = await s.rpc('week_index_for_date', { d: isoDate });
  if (error) {
    console.error('RPC week_index_for_date error', error);
    // Fallback to latest available week if RPC fails
    const { data: latest, error: err2 } = await s
      .from('weekly_standings')
      .select('week_index')
      .order('week_index', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (err2 || !latest) return 0;
    return latest.week_index as number;
  }
  return (data as number) ?? 0;
}

async function getTotalsForUser(userId: string, weekIndex: number): Promise<Totals> {
  const s = supa();

  const { data, error } = await s
    .from('weekly_standings')
    .select('goals,assists,player_points,pick_points,total_points')
    .eq('user_id', userId)
    .eq('week_index', weekIndex)
    .maybeSingle();

  if (error) {
    console.error('weekly_standings select error', error);
    return { goals: 0, assists: 0, player_points: 0, pick_points: 0, total_points: 0 };
  }

  if (!data) {
    return { goals: 0, assists: 0, player_points: 0, pick_points: 0, total_points: 0 };
  }

  return data as Totals;
}

export default async function TeamPage({ params }: { params: { slug: string } }) {
  // For now, slug = user_id (UUID)
  const userId = params.slug;

  const weekIndex = await getCurrentWeekFromDB();
  const totals = await getTotalsForUser(userId, weekIndex);

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
