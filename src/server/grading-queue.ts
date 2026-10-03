import "server-only";
import { getDb } from "./db";

const MAX_CONCURRENT_JOBS = 1;

interface HomeworkJob {
  id: number;
  kind: string;
  homework_id: string;
  submission_id?: number;
}

let isRunning = false;
let activeJobs = 0;

export function startGradingQueue() {
  if (isRunning) return;
  isRunning = true;
  pollQueue();
}

async function pollQueue() {
  if (!isRunning) return;

  try {
    if (activeJobs < MAX_CONCURRENT_JOBS) {
      const job = claimJob();
      if (job) {
        activeJobs++;
        processJob(job).finally(() => {
          activeJobs--;
          // immediately poll again
          setImmediate(pollQueue);
        });
      }
    }
  } catch (err) {
    console.error("[Grading Queue] Polling error", err);
  }

  // Poll every 2 seconds
  setTimeout(pollQueue, 2000);
}

function claimJob() {
  const db = getDb();
  return db.transaction(() => {
    const job = db.prepare(`
      SELECT *
      FROM homework_jobs
      WHERE status = 'queued'
        AND available_at <= ?
      ORDER BY id
      LIMIT 1
    `).get(Date.now()) as HomeworkJob | undefined;

    if (!job) return null;

    db.prepare(`
      UPDATE homework_jobs
      SET status = 'running',
          attempts = attempts + 1,
          locked_at = ?
      WHERE id = ?
        AND status = 'queued'
    `).run(Date.now(), job.id);

    return job;
  }).immediate();
}

async function processJob(job: HomeworkJob) {
  const db = getDb();
  try {
    if (job.kind === 'grade_submission') {
      const response = await fetch(
        process.env.GRADER_INTERNAL_URL || "http://gateway:3002/grade-homework",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GRADER_INTERNAL_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "grade_submission",
            submissionId: job.submission_id,
          }),
          signal: AbortSignal.timeout(900_000), // 15 mins max
        }
      );

      if (!response.ok) {
        throw new Error("Could not queue grading. " + response.statusText);
      }
      
      const result = await response.json();
      
      // Update submission status based on result... wait, where is this updated?
      // Wait, in batch12.txt it says:
      // "5. Let the worker update it later."
      // BUT `gateway/homework-grader.mjs` runs `worker.py` which just returns stdout JSON.
      // So THIS queue worker needs to update the database!
      
      db.prepare(`
        UPDATE homework_submissions
        SET status = 'graded',
            passed_tests = ?,
            awarded_xp = ?,
            results_json = ?,
            finished_at = ?,
            error = NULL
        WHERE id = ?
      `).run(
        result.passedTests || 0,
        result.awardedXp || 0,
        JSON.stringify(result.results || []),
        Date.now(),
        job.submission_id
      );

      db.prepare(`
        UPDATE homework_jobs
        SET status = 'complete',
            finished_at = ?
        WHERE id = ?
      `).run(Date.now(), job.id);
      
    } else if (job.kind === 'prepare_expected') {
      const response = await fetch(
        process.env.GRADER_INTERNAL_URL || "http://gateway:3002/grade-homework",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GRADER_INTERNAL_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "prepare_expected",
            homeworkId: job.homework_id,
          }),
          signal: AbortSignal.timeout(900_000),
        }
      );

      if (!response.ok) {
        throw new Error("Could not prepare expected snapshots. " + response.statusText);
      }

      db.prepare(`
        UPDATE homework_jobs
        SET status = 'complete',
            finished_at = ?
        WHERE id = ?
      `).run(Date.now(), job.id);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Grading Queue] Job failed", job.id, message);
    db.prepare(`
      UPDATE homework_jobs
      SET status = 'failed',
          error = ?,
          finished_at = ?
      WHERE id = ?
    `).run(message, Date.now(), job.id);

    if (job.kind === 'grade_submission' && job.submission_id) {
      db.prepare(`
        UPDATE homework_submissions
        SET status = 'error',
            error = ?,
            finished_at = ?
        WHERE id = ?
      `).run(
        "Grading could not finish. Your script was saved; please retry.",
        Date.now(),
        job.submission_id
      );
    }
  }
}
