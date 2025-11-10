import { getCurrentWeekIndex } from './utils/week';
import StandingsClient from './standings-client';

export default async function HomePage() {
  const weekIndex = getCurrentWeekIndex();
  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Puck-Picks — Weekly Leaderboard</h1>
      <StandingsClient weekIndex={weekIndex} />
    </main>
  );
}
