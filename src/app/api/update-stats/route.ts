export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { verifySignature } from "@upstash/qstash/dist/nextjs";
import { GET as seasonSyncGET } from "../nhl-sync/season/route";

/**
 * Secure route that accepts only valid Upstash QStash requests.
 */
export const GET = verifySignature(async () => {
  // Directly call the NHL season sync
  return seasonSyncGET();
});
