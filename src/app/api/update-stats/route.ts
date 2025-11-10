// Platform: Visual Studio Code
// File: src/app/api/update-stats/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRV = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API = process.env.SPORTDATAIO_API_KEY!;

function ymdUTC(d = new Date()) {
  const u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const yyyy = u.getUTCFullYear();
  const mm = String(u.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(u.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET() {
  const supabase = createClient(SUPABASE_URL, SRV);

  try {
    const date = ymdUTC();
    const url = `https://api.sportsdata.io/v4/nhl/stats/json/PlayerGameStatsByDate/${date}?key=${API}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`SportsDataIO error: ${res.status}`);

    const stats = await res.json();

    // Expect your existing "players" table to have (id, nhl_id)
    // We'll look up player_id by nhl_id and upsert into player_points.
    // If a player doesn't exist in players yet, we create a stub row.

    // 1) Create a map of nhl_id -> {goals, assists, points}
    const byNhl: Record<number, { goals: number; assists: number; points: number; name: string; team: string; }> = {};
    for (const s of stats) {
      const nhlId = s.PlayerID;
      const goals = s.Goals || 0;
      const assists = s.Assists || 0;
      const points = 6 * goals + 3 * assists;
      byNhl[nhlId] = { goals, assists, points, name: s.Name, team: s.Team };
    }

    const nhlIds = Object.keys(byNhl).map(Number);
    if (nhlIds.length === 0) return NextResponse.json({ ok: true, updated: 0 });

    // 2) fetch known players by nhl_id
    const { data: existingPlayers, error: qErr } = await supabase
      .from('players')
      .select('id, nhl_id')
      .in('nhl_id', nhlIds);
    if (qErr) throw qErr;

    const known = new Map<number, string>(); // nhl_id -> player_id
    (existingPlayers || []).forEach((p: any) => known.set(p.nhl_id, p.id));

    // 3) create stubs for unknown players
    const missing = nhlIds.filter(id => !known.has(id));
    if (missing.length) {
      const stubs = missing.map((nhl_id) => ({
        nhl_id,
        name: byNhl[nhl_id].name || `NHL #${nhl_id}`,
        team: byNhl[nhl_id].team || null,
        position: null
      }));
      const { data: inserted, error: insErr } = await supabase
        .from('players')
        .insert(stubs)
        .select('id, nhl_id');
      if (insErr) throw insErr;
      (inserted || []).forEach((p: any) => known.set(p.nhl_id, p.id));
    }

    // 4) Upsert into player_points using player_id + nhl_id
    const rows = nhlIds.map((nhl_id) => {
      const player_id = known.get(nhl_id);
      const { goals, assists, points } = byNhl[nhl_id];
      return { player_id, nhl_id, goals, assists, points, updated_at: new Date().toISOString() };
    }).filter(r => r.player_id); // drop any that still failed to resolve

    if (rows.length) {
      const { error: upErr } = await supabase
        .from('player_points')
        .upsert(rows, { onConflict: 'player_id' });
      if (upErr) throw upErr;

      // Optional: ensure a visible write (handy in testing)
      await supabase.rpc('realtime_force_touch_players_today');
    }

    return NextResponse.json({ ok: true, updated: rows.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
