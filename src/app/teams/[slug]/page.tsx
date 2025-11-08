import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Team = {
  id: string;
  name: string;
  owner: string | null;
  slug: string;
};

export default async function TeamDetail({ params }: { params: { slug: string } }) {
  // Fetch team info
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("id, name, owner, slug")
    .eq("slug", params.slug)
    .single<Team>();

  if (teamErr || !team) {
    return (
      <main className="space-y-4 p-6">
        <Link href="/teams" className="text-sm underline">← Back to Teams</Link>
        <p className="text-red-600">Team not found.</p>
      </main>
    );
  }

  // For now, show week 1
  const week = 1;

  // Totals (from view)
// ... after fetching team ...
// compute same league week index on server (simple: reuse current week view by choosing MAX available for team)
const { data: scoreRow } = await supabase
  .from("v_team_week_scores")
  .select("week, goals, assists, correct_picks, score")
  .eq("team_id", team.id)
  .order("week", { ascending: false })
  .limit(1)
  .maybeSingle();

<section className="rounded-2xl border p-6 bg-white">
  <h2 className="text-lg font-semibold mb-2">This Week (Thu–Sun)</h2>
  <div className="grid grid-cols-4 gap-6">
    <div><div className="text-3xl font-bold">{scoreRow?.goals ?? 0}</div><div className="text-xs text-slate-500">Goals (×6)</div></div>
    <div><div className="text-3xl font-bold">{scoreRow?.assists ?? 0}</div><div className="text-xs text-slate-500">Assists (×3)</div></div>
    <div><div className="text-3xl font-bold">{scoreRow?.correct_picks ?? 0}</div><div className="text-xs text-slate-500">Correct Picks (×1)</div></div>
    <div><div className="text-3xl font-bold">{scoreRow?.score ?? 0}</div><div className="text-xs text-slate-500">Total</div></div>
  </div>
</section>


  // Active roster
  const { data: roster } = await supabase
    .from("roster")
    .select("player_id, players(name, position, team_abbr)")
    .eq("team_id", team.id)
    .eq("active", true);

  return (
    <main className="space-y-6 p-6">
      <Link href="/teams" className="text-sm underline">← Back to Teams</Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{team.name}</h1>
        {team.owner && <p className="text-sm text-slate-500">Owner: {team.owner}</p>}
      </header>

      <section className="rounded-2xl border p-6 bg-white">
        <h2 className="text-lg font-semibold mb-2">This Week</h2>
        <div className="flex gap-10">
          <div><div className="text-3xl font-bold">{totals?.goals ?? 0}</div><div className="text-xs text-slate-500">Goals</div></div>
          <div><div className="text-3xl font-bold">{totals?.assists ?? 0}</div><div className="text-xs text-slate-500">Assists</div></div>
        </div>
      </section>

      <section className="rounded-2xl border p-6 bg-white">
        <h2 className="text-lg font-semibold mb-2">Active Roster</h2>
        <ul className="space-y-2">
          {(roster ?? []).map((r: any) => (
            <li key={r.player_id} className="flex items-center justify-between">
              <span>{r.players?.name}</span>
              <span className="text-xs text-slate-500">
                {r.players?.position} • {r.players?.team_abbr}
              </span>
            </li>
          ))}
          {(!roster || roster.length === 0) && (
            <li className="text-sm text-slate-500">No players yet.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
