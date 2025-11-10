'use client';
import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { realtime: { params: { eventsPerSecond: 5 } } }
);

export default function RealtimeWeeklyStandings({
  weekIndex,
  onInvalidate
}: { weekIndex: number; onInvalidate: () => void }) {
  useEffect(() => {
    const channel = supabase
      .channel(`weekly-standings-${weekIndex}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weekly_standings' },
        (payload) => {
          const row: any = payload.new ?? payload.old;
          if (!row) return;
          if (row.week_index !== weekIndex) return;
          onInvalidate();
        }
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [weekIndex, onInvalidate]);

  return null;
}
