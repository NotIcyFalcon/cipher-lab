import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { recipeSchema } from "@/lib/lab-recipe";

function authorized(header: string | null): boolean {
  const token = process.env.GRADER_INTERNAL_TOKEN;
  if (!token || !header) return false;

  const supplied = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${token}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

// Called by the lab gateway (not browsers) to get the runtime spec for a lab:
// the built image for each machine plus the metadata needed to start and
// connect to a session. proxy.ts lets /api/internal/* through; this bearer
// token is the only credential, and Caddy refuses these paths from outside.
export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const labId = new URL(request.url).searchParams.get("labId");
  if (!labId || labId.length > 128) {
    return NextResponse.json({ error: "Missing labId" }, { status: 400 });
  }

  const db = getDb();

  const lab = db.prepare(`
    SELECT build_status, current_build_id, recipe_json
    FROM labs WHERE id = ?
  `).get(labId) as
    | { build_status: string; current_build_id: number | null; recipe_json: string }
    | undefined;

  if (!lab) {
    return NextResponse.json({ error: "Unknown lab" }, { status: 404 });
  }

  if (!lab.current_build_id || lab.build_status === "draft") {
    return NextResponse.json({ error: "This lab has not been built yet." }, { status: 409 });
  }

  const build = db.prepare(`SELECT images_json FROM lab_builds WHERE id = ?`).get(lab.current_build_id) as
    | { images_json: string }
    | undefined;

  let images: Record<string, string> = {};
  try {
    images = build ? JSON.parse(build.images_json) : {};
  } catch {
    images = {};
  }

  let recipe;
  try {
    recipe = recipeSchema.parse(JSON.parse(lab.recipe_json));
  } catch {
    return NextResponse.json({ error: "This lab needs to be rebuilt." }, { status: 409 });
  }

  const machines = [];
  for (const machine of recipe.machines) {
    const image = images[machine.key];
    if (!image) {
      return NextResponse.json({ error: "This lab needs to be rebuilt." }, { status: 409 });
    }
    machines.push({
      key: machine.key,
      hostname: machine.hostname,
      image,
      memoryMb: machine.memoryMb,
      mainUser: machine.mainUser,
      allowPrivilegeEscalation: machine.allowPrivilegeEscalation,
      rawNetwork: machine.rawNetwork,
    });
  }

  const entry = recipe.machines.find((m) => m.key === recipe.entryMachine);

  return NextResponse.json({
    labId,
    entryMachine: recipe.entryMachine,
    entryUser: entry?.mainUser ?? "root",
    policyMode: recipe.policy.mode,
    machines,
  });
}
