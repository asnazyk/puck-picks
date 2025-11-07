// src/app/teams/page.tsx
import { supabase } from "@/lib/supabase";

export const revalidate = 30; // ISR: revalidate every 30s (tune as needed)

export default async function TeamsPage() {
  // Query the 'teams' table, ordered by name
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, slug, owner, logo_url")
    .order("name", { ascending: true });

  if (error) {
    // Simple error surface; you can style this as a toast later
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Teams</h1>
        <p className="text-sm text-red-600">Error loading teams: {error.message}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Teams</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(teams ?? []).map((t) => (
          <a
            key={t.id}
            href={`/teams/${t.slug}`}
            className="rounded-2xl border shadow-sm p-6 bg-white hover:shadow-md flex items-center gap-4"
          >
            {t.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.logo_url} alt={t.name} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-100 grid place-items-center text-slate-500 text-xs">PP</div>
            )}
            <div>
              <div className="text-lg font-semibold">{t.name}</div>
              {t.owner && <div className="text-xs text-slate-500 mt-1">Owner: {t.owner}</div>}
            </div>
          </a>
        ))}
      </div>

      {(!teams || teams.length === 0) && (
        <p className="text-sm text-slate-500">
          No teams yet. Add a couple rows to the <code>teams</code> table in Supabase to see them here.
        </p>
      )}
    </section>
  );
}

