import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Puck-Picks",
  description: "Fantasy hockey, simplified.",
};

function Nav() {
  return (
    <nav className="w-full border-b bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Puck-Picks
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/teams" className="hover:underline">Teams</Link>
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-10">
          {children}
        </main>
        <footer className="mt-16 border-t">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center text-xs text-slate-500">
            © {new Date().getFullYear()} Puck-Picks
          </div>
        </footer>
      </body>
    </html>
  );
}
