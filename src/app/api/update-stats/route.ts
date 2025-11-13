export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { GET as seasonSyncGET } from "../nhl-sync/season/route";

/**
 * QStash (and you) can call this endpoint.
 * It just reuses the NHL season sync logic.
 */

// For manual GET calls (browser, etc.)
export async function GET(_req: NextRequest) {
  return seasonSyncGET();
}

// For QStash POST calls (default behavior in their UI)
export async function POST(_req: NextRequest) {
  return seasonSyncGET();
}
