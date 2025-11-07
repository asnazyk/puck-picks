export default function Home() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">This Week’s Leaders</h1>
      <p className="text-slate-600 text-sm">
        Connect Supabase and seed a week to see live goals and assists totals here.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border shadow-sm p-6 bg-white">
            <div className="text-sm text-slate-500">Team</div>
            <div className="text-xl font-semibold">—</div>
            <div className="mt-4 flex gap-8">
              <div><div className="text-2xl font-bold">0</div><div className="text-xs text-slate-500">Goals</div></div>
              <div><div className="text-2xl font-bold">0</div><div className="text-xs text-slate-500">Assists</div></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
