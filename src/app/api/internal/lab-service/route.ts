import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/server/db";

const DEFAULT_SERVICE = "linux-basics";

function authorized(header: string | null): boolean {
  const token = process.env.GRADER_INTERNAL_TOKEN;

  // Without a configured token, "Bearer undefined" would otherwise match.
  if (!token || !header) return false;

  const supplied = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${token}`);

  return supplied.length === expected.length &&
    timingSafeEqual(supplied, expected);
}

// Called by the lab gateway (not browsers) to map a lab ID to the compose
// service that runs it. proxy.ts lets /api/internal/* through without a
// session; this bearer token is the only credential.
export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const labId = new URL(request.url).searchParams.get("labId");

  if (!labId || labId.length > 128) {
    return NextResponse.json({ error: "Missing labId" }, { status: 400 });
  }

  try {
    const row = getDb().prepare(`
      SELECT runtime_service FROM labs WHERE id = ?
    `).get(labId) as { runtime_service: string | null } | undefined;

    if (!row) {
      return NextResponse.json({ error: "Unknown lab" }, { status: 404 });
    }

    return NextResponse.json({
      service: row.runtime_service || DEFAULT_SERVICE,
    });
  } catch (error) {
    console.error("Failed to query runtime_service:", error);
    return NextResponse.json({ service: DEFAULT_SERVICE });
  }
}
