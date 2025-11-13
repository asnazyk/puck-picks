export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { GET as seasonSyncGET } from "../nhl-sync/season/route";

/**
 * This route is called by the existing Vercel cron job (/api/update-stats).
 * It simply reuses the NHL season sync handler so both paths do the same thing.
 */
export async function GET(_req: NextRequest) {
  return seasonSyncGET();
}
