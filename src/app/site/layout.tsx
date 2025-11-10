// app/(site)/layout.tsx
export const metadata = {
  title: "Puck-Picks",
  description: "Fantasy hockey leaderboard and stats",
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white text-gray-900 antialiased">
      {children}
    </div>
  )
}
