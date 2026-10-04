import "server-only";

import { createHash } from "node:crypto";
import { getDb } from "@/server/db";
import { recipeSchema, type LabRecipe } from "@/lib/lab-recipe";

const POLL_MS = 3_000;
const BUILD_TIMEOUT_MS = 15 * 60_000;

export function recipeHash(recipe: LabRecipe): string {
  return createHash("sha256").update(JSON.stringify(recipe)).digest("hex");
}

/**
 * Whether the stored recipe matches the last successful build. Used to show
 * "needs rebuild" and to decide the build_status after a save.
 */
export function labNeedsBuild(builtHash: string | null, recipe: LabRecipe): boolean {
  return builtHash !== recipeHash(recipe);
}

type LabBuildRow = {
  id: number;
  lab_id: string;
  recipe_json: string;
};

export function enqueueLabBuild(labId: string): number {
  const db = getDb();

  return db.transaction(() => {
    const lab = db.prepare(`SELECT recipe_json FROM labs WHERE id = ?`).get(labId) as
      | { recipe_json: string }
      | undefined;

    if (!lab) throw new Error("Lab not found.");

    const recipe = recipeSchema.parse(JSON.parse(lab.recipe_json));
    const now = Date.now();

    const result = db.prepare(`
      INSERT INTO lab_builds (lab_id, status, recipe_json, recipe_hash, created_at)
      VALUES (?, 'queued', ?, ?, ?)
    `).run(labId, JSON.stringify(recipe), recipeHash(recipe), now);

    db.prepare(`UPDATE labs SET build_status = 'queued' WHERE id = ?`).run(labId);

    return Number(result.lastInsertRowid);
  }).immediate();
}

let running = false;

export function startLabBuildQueue() {
  if (running) return;
  running = true;
  void poll();
}

async function poll() {
  if (!running) return;
  try {
    const job = claim();
    if (job) {
      await processBuild(job);
      setImmediate(poll);
      return;
    }
  } catch (error) {
    console.error("[Lab build queue]", error);
  }
  setTimeout(poll, POLL_MS).unref();
}

function claim(): LabBuildRow | null {
  const db = getDb();
  return db.transaction(() => {
    const job = db.prepare(`
      SELECT id, lab_id, recipe_json
      FROM lab_builds
      WHERE status = 'queued'
      ORDER BY id
      LIMIT 1
    `).get() as LabBuildRow | undefined;

    if (!job) return null;

    db.prepare(`
      UPDATE lab_builds
      SET status = 'building', started_at = ?
      WHERE id = ? AND status = 'queued'
    `).run(Date.now(), job.id);

    db.prepare(`UPDATE labs SET build_status = 'building' WHERE id = ?`).run(job.lab_id);

    return job;
  }).immediate();
}

async function processBuild(job: LabBuildRow) {
  const db = getDb();
  const recipe = JSON.parse(job.recipe_json) as LabRecipe;

  try {
    const url = process.env.LAB_BUILDER_URL || "http://gateway:3003/build-lab";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GRADER_INTERNAL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ labId: job.lab_id, buildId: job.id, recipe }),
      signal: AbortSignal.timeout(BUILD_TIMEOUT_MS),
    });

    const result = await response.json().catch(() => ({ ok: false, error: "The builder returned an invalid response." }));

    if (!response.ok || !result.ok) {
      finishFailed(job, result.error || `Build failed (HTTP ${response.status}).`, result.log || "");
      return;
    }

    const hash = recipeHash(recipe);
    const now = Date.now();

    db.transaction(() => {
      db.prepare(`
        UPDATE lab_builds
        SET status = 'succeeded', images_json = ?, log = ?, finished_at = ?, error = NULL
        WHERE id = ?
      `).run(JSON.stringify(result.images || {}), String(result.log || "").slice(-200_000), now, job.id);

      db.prepare(`
        UPDATE labs
        SET build_status = 'ready', current_build_id = ?, built_recipe_hash = ?
        WHERE id = ?
      `).run(job.id, hash, job.lab_id);
    })();
  } catch (error) {
    finishFailed(job, error instanceof Error ? error.message : "The build could not finish.", "");
  }
}

function finishFailed(job: LabBuildRow, message: string, log: string) {
  const db = getDb();
  db.transaction(() => {
    db.prepare(`
      UPDATE lab_builds
      SET status = 'failed', error = ?, log = ?, finished_at = ?
      WHERE id = ?
    `).run(message.slice(0, 2_000), String(log).slice(-200_000), Date.now(), job.id);

    // Keep 'ready' if a previous build still works; otherwise mark failed.
    db.prepare(`
      UPDATE labs
      SET build_status = CASE WHEN current_build_id IS NULL THEN 'failed' ELSE 'ready' END
      WHERE id = ?
    `).run(job.lab_id);
  })();
}
