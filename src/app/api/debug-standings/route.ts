// src/app/api/debug-standings/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = url.searchParams.get('user');
  const week = Number(url.searchParams.get('week'));

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // quick env sanity
  if (!SUPABASE_URL || !ANON) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'Missing env',
        env_present: { SUPABASE_URL: !!SUPABASE_URL, ANON: !!ANON }
      },
      { status: 500 }
    );
  }

  if (!user || Number.isNaN(week)) {
    return NextResponse.json(
      { ok: false, reason: 'Missing user or week', got: { user, week } },
      { status: 400 }
    );
  }

  const supabase = createClient(SUPABASE_URL, ANON);

  const { data, error } = await supabase
    .from('weekly_standings')
    .select('week_index,user_id,goals,assists,player_points,pick_points,total_points,updated_at')
    .eq('user_id', user)
    .eq('week_index', week)
    .maybeSingle();

  return NextResponse.json(
    {
      ok: !error,
      env_present: { SUPABASE_URL: true, ANON: true },
      user,
      week,
      data,
      error: error ?? null
    },
    { status: error ? 500 : 200 }
  );
}
