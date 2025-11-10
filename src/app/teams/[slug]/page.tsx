// src/app/teams/[slug]/page.tsx
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// simple util – keep in sync with db epoch if you change it
function getCurrentWeekIndex(date = new Date()): number {
  const epoch = Date.UTC(2024, 8, 26); // 2024-09-26 (Thu)
  const d = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((d - epoch) / msPerWeek);
}

type Totals = {
  goals: number;
  assists: number;
  player_points: number;
  pick_points: number;
  total_points: number;
};

async function getTotalsForUser(userId: string, weekIndex: number): Promise<Totals> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from('weekly_standings')
    .select('goals,assists,player_points,pick_points,total_points')
    .eq('user_id', userId)
    .eq('week_index', weekIndex)
    .maybeSingle();

  if (error) {
    // return zeros instead of throwing to keep the page building
    return { goals: 0, assists: 0, player_points: 0, pick_points: 0, total_points: 0 };
  }

  if (!data) {
    return { goals: 0, assists: 0, player_points: 0, pick_points: 0, total_points: 0 };
  }

  return data as Totals;
}

export default async function TeamPage({ params }: { params: { slug: string } }) {
  // Your slug should ultimately map to a user/team owner.
  // For now we assume slug is the user_id (UUID) to keep this compiling.
  const userId = params.slug;
  const weekIndex = getCurrentWeekIndex();
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
      </section>

      {/* TODO: roster and game picks detail sections */}
      <section>
        <p className="text-sm text-slate-500">
          Roster and picks details coming soon.
        </p>
      </section>
    </main>
  );
}
