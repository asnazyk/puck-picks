// src/app/teams/page.tsx
import Link from "next/link";

export default function TeamsPage() {
  // Temporary demo data so the page isn't empty.
  // We'll swap this to Supabase data next.
  const demo = [
    { slug: "andy", name: "Andy Snazyk", owner: "Andy" },
    { slug: "dave", name: "Dave", owner: "Dave" },
    { slug: "sophia", name: "Sophia", owner: "Sophia" },
  ];

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Teams</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {demo.map((t) => (
          <Link
            key={t.slug}
            href={`/teams/${t.slug}`}
            className="rounded-2xl border shadow-sm p-6 bg-white hover:shadow-md"
          >
            <div className="text-lg font-semibold">{t.name}</div>
            <div className="text-xs text-slate-500 mt-1">Owner: {t.owner}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
