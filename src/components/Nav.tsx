// src/components/Nav.tsx
// Simple, Clerk-free navigation bar for Puck-Picks
import Link from "next/link";

export default function Nav() {
  return (
    <nav className="w-full border-b">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">Puck-Picks</Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/teams" className="hover:underline">Teams</Link>
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        </div>
      </div>
    </nav>
  );
}
