export function getCurrentWeekIndex(date = new Date()): number {
  const epoch = Date.UTC(2024, 8, 26); // 2024-09-26 (Thu)
  const d = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((d - epoch) / msPerWeek);
}
