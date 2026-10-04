import "server-only";

import { createHash } from "node:crypto";
import { getDb } from "@/server/db";
import { callGatewayStream } from "@/server/gateway-client";
import { recipeSchema, type LabRecipe } from "@/lib/lab-recipe";

const POLL_MS = 3_000;
const BUILD_TIMEOUT_MS = 45 * 60_000;
const LOG_LIMIT = 200_000;

export function recipeHash(recipe: LabRecipe): string {
  return createHash("sha256").update(JSON.stringify(recipe)).digest("hex");
}

/** Whether the stored recipe differs from the last successful build. */
export function labNeedsBuild(builtHash: string | null, recipe: LabRecipe): boolean {
  return builtHash !== recipeHash(recipe);
}

type LabBuildRow = {
  id: number;
  lab_id: string;
  recipe_json: string;
};

/**
 * Queue a build of the lab's saved recipe and return the build id. If a build
 * for this lab is already waiting in the queue, it is updated to the latest
 * recipe instead of adding a second one. (A build that is already running
 * finishes first; the queued one then builds the newest recipe.)
 */
export function enqueueLabBuild(labId: string): number {
  const db = getDb();

  return db.transaction(() => {
    const lab = db.prepare(`SELECT recipe_json FROM labs WHERE id = ?`).get(labId) as
      | { recipe_json: string }
      | undefined;
    if (!lab) throw new Error("Lab not found.");

    const recipe = recipeSchema.parse(JSON.parse(lab.recipe_json));

    const queued = db.prepare(`
      SELECT id FROM lab_builds WHERE lab_id = ? AND status = 'queued' ORDER BY id LIMIT 1
    `).get(labId) as { id: number } | undefined;

    if (queued) {
      db.prepare(`UPDATE lab_builds SET recipe_json = ?, recipe_hash = ? WHERE id = ?`)
        .run(JSON.stringify(recipe), recipeHash(recipe), queued.id);
      db.prepare(`UPDATE labs SET build_status = 'queued' WHERE id = ?`).run(labId);
      return queued.id;
    }

    const result = db.prepare(`
      INSERT INTO lab_builds (lab_id, status, recipe_json, recipe_hash, created_at)
      VALUES (?, 'queued', ?, ?, ?)
    `).run(labId, JSON.stringify(recipe), recipeHash(recipe), Date.now());

    db.prepare(`UPDATE labs SET build_status = 'queued' WHERE id = ?`).run(labId);
    return Number(result.lastInsertRowid);
  }).immediate();
}

// Labs that have never had a build (for example, labs converted by migration
// 015) are built automatically once, so they work without a manual click.
function queueNeverBuiltLabs() {
  const db = getDb();
  const labs = db.prepare(`
    SELECT l.id FROM labs l
    WHERE NOT EXISTS (SELECT 1 FROM lab_builds b WHERE b.lab_id = l.id)
  `).all() as { id: string }[];

  for (const { id } of labs) {
    try {
      enqueueLabBuild(id);
    } catch (error) {
      console.error(`[Lab build queue] Lab ${id} has an invalid recipe:`, error);
    }
  }
}

let started = false;

export function startLabBuildQueue() {
  if (started) return;
  started = true;

  try {
    queueNeverBuiltLabs();
  } catch (error) {
    console.error("[Lab build queue] Startup check failed:", error);
  }

  const tick = async () => {
    try {
      const job = claim();
      if (job) {
        await processBuild(job);
        setTimeout(tick, 0).unref();
        return;
      }
    } catch (error) {
      console.error("[Lab build queue]", error);
    }
    setTimeout(tick, POLL_MS).unref();
  };

  setTimeout(tick, 1_000).unref();
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

    db.prepare(`UPDATE lab_builds SET status = 'building', started_at = ? WHERE id = ?`).run(Date.now(), job.id);
    db.prepare(`UPDATE labs SET build_status = 'building' WHERE id = ?`).run(job.lab_id);
    return job;
  }).immediate();
}

async function processBuild(job: LabBuildRow) {
  const db = getDb();
  const recipe = JSON.parse(job.recipe_json) as LabRecipe;

  // A failed rebuild must not delete the images the lab currently runs on.
  const current = db.prepare(`
    SELECT b.images_json FROM labs l
    JOIN lab_builds b ON b.id = l.current_build_id
    WHERE l.id = ?
  `).get(job.lab_id) as { images_json: string } | undefined;

  let keepImages: string[] = [];
  try {
    keepImages = current ? Object.values(JSON.parse(current.images_json) as Record<string, string>) : [];
  } catch {
    keepImages = [];
  }

  let log = "";
  let lastFlush = 0;
  const appendLog = db.prepare(`UPDATE lab_builds SET log = ? WHERE id = ?`);

  const flush = (force = false) => {
    if (!force && Date.now() - lastFlush < 1_500) return;
    lastFlush = Date.now();
    appendLog.run(log.slice(-LOG_LIMIT), job.id);
  };

  const result = await callGatewayStream(
    "/labs/build",
    { labId: job.lab_id, buildId: job.id, recipe, keepImages },
    {
      timeoutMs: BUILD_TIMEOUT_MS,
      onLog: (text) => {
        log += text;
        if (log.length > LOG_LIMIT * 2) log = log.slice(-LOG_LIMIT);
        flush();
      },
    },
  );

  flush(true);

  if (!result.ok) {
    finishFailed(job, result.error || "The build failed.");
    return;
  }

  const images = (result.images ?? {}) as Record<string, string>;
  const now = Date.now();

  db.transaction(() => {
    db.prepare(`
      UPDATE lab_builds
      SET status = 'succeeded', images_json = ?, finished_at = ?, error = NULL
      WHERE id = ?
    `).run(JSON.stringify(images), now, job.id);

    db.prepare(`
      UPDATE labs
      SET build_status = CASE
            WHEN (SELECT COUNT(*) FROM lab_builds WHERE lab_id = ? AND status = 'queued') > 0 THEN 'queued'
            ELSE 'ready'
          END,
          current_build_id = ?,
          built_recipe_hash = ?
      WHERE id = ?
    `).run(job.lab_id, job.id, recipeHash(recipe), job.lab_id);
  })();
}

function finishFailed(job: LabBuildRow, message: string) {
  const db = getDb();
  db.transaction(() => {
    db.prepare(`
      UPDATE lab_builds SET status = 'failed', error = ?, finished_at = ? WHERE id = ?
    `).run(message.slice(0, 2_000), Date.now(), job.id);

    db.prepare(`
      UPDATE labs
      SET build_status = CASE
            WHEN (SELECT COUNT(*) FROM lab_builds WHERE lab_id = ? AND status = 'queued') > 0 THEN 'queued'
            ELSE 'failed'
          END
      WHERE id = ?
    `).run(job.lab_id, job.lab_id);
  })();
}
