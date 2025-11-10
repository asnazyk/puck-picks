// src/lib/standings.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function fetchWeeklyStandings(weekIndex: number) {
  const { data, error } = await supabase
    .from('weekly_standings')
    .select('week_index,user_id,goals,assists,player_points,pick_points,total_points,updated_at')
    .eq('week_index', weekIndex)
    .order('total_points', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
