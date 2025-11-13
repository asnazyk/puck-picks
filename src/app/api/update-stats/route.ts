export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { GET as seasonSyncGET } from "../nhl-sync/season/route";

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;

function isAuthorized(req: NextRequest): boolean {
  const token =
    req.headers.get("Upstash-Token") ??
    req.headers.get("upstash-token") ??
    "";
  return token === QSTASH_TOKEN;
}

// Accept GET and POST from QStash
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }
  return seasonSyncGET();
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }
  return seasonSyncGET();
}
