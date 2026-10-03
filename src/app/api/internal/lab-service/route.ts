import { NextResponse } from "next/server";
import { getDb } from "@/server/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const labId = searchParams.get("labId");

  if (!labId) {
    return NextResponse.json({ error: "Missing labId" }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${process.env.GRADER_INTERNAL_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const row = getDb().prepare(`
      SELECT runtime_service FROM labs WHERE id = ?
    `).get(labId) as { runtime_service: string | null } | undefined;

    return NextResponse.json({
      service: row?.runtime_service || "linux-basics",
    });
  } catch (error) {
    console.error("Failed to query runtime_service:", error);
    return NextResponse.json({ service: "linux-basics" });
  }
}
