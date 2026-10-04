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

function notReady(buildStatus: string) {
  const message =
    buildStatus === "queued" || buildStatus === "building"
      ? "This lab is still being built. Try again in a minute or two."
      : buildStatus === "failed"
        ? "This lab's build failed. The owner can see why in Creator → Labs."
        : "This lab has not been built yet. The owner can build it in Creator → Labs.";
  return NextResponse.json({ error: message }, { status: 409 });
}

// Called by the lab gateway (not browsers): the runtime spec of a lab's last
// successful build. The build's own recipe snapshot is used, so editing a lab
// never mismatches the images that are already built. proxy.ts lets
// /api/internal/* through; this bearer token is the only credential, and
// Caddy refuses these paths from the internet.
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
    SELECT l.build_status, l.current_build_id, b.recipe_json, b.images_json
    FROM labs l
    LEFT JOIN lab_builds b ON b.id = l.current_build_id
    WHERE l.id = ?
  `).get(labId) as
    | { build_status: string; current_build_id: number | null; recipe_json: string | null; images_json: string | null }
    | undefined;

  if (!lab) {
    return NextResponse.json({ error: "Unknown lab" }, { status: 404 });
  }
  if (!lab.current_build_id || !lab.recipe_json || !lab.images_json) {
    return notReady(lab.build_status);
  }

  let images: Record<string, string>;
  let recipe;
  try {
    images = JSON.parse(lab.images_json);
    recipe = recipeSchema.parse(JSON.parse(lab.recipe_json));
  } catch {
    return NextResponse.json({ error: "This lab needs to be rebuilt in Creator → Labs." }, { status: 409 });
  }

  const machines = [];
  for (const machine of recipe.machines) {
    const image = images[machine.key];
    if (!image) {
      return NextResponse.json({ error: "This lab needs to be rebuilt in Creator → Labs." }, { status: 409 });
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

  return NextResponse.json({
    labId,
    buildId: lab.current_build_id,
    entryMachine: recipe.entryMachine,
    policyMode: recipe.policy.mode,
    machines,
  });
}
