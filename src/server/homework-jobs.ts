import "server-only";

import { getDb } from "@/server/db";
import { callGatewayStream } from "@/server/gateway-client";
import {
  definitionHash,
  environmentHash,
  isReady,
  loadHomework,
  questionTotal,
  type LoadedHomework,
  type LoadedQuestion,
} from "@/server/homework-catalog";
import { compareTest } from "@/lib/homework-compare";
import type { Observation, TestFeedback } from "@/lib/homework-results";

const POLL_MS = 2_000;
const LOG_LIMIT = 200_000;
const ENV_BUILD_TIMEOUT_MS = 45 * 60_000;

type JobRow = {
  id: number;
  kind: "prepare_expected" | "grade_submission";
  homework_id: string;
  question_id: string | null;
  submission_id: number | null;
  attempts: number;
};

// ---------- enqueueing ----------

/**
 * Called after a homework is saved. Recomputes what the expected results
 * depend on; if that changed (or the homework was never prepared), queues a
 * preparation job. Saving only titles, XP or comparison options keeps the
 * existing expected results.
 */
export function enqueueHomeworkPrepare(homeworkId: string, { force = false } = {}) {
  const db = getDb();
  const homework = loadHomework(homeworkId);
  if (!homework) return;

  const hash = definitionHash(homework);

  db.transaction(() => {
    db.prepare(`UPDATE homework SET definition_hash = ? WHERE id = ?`).run(hash, homeworkId);

    const upToDate = !force && isReady({ ...homework, definitionHash: hash });
    if (upToDate) return;

    // One pending preparation per homework is enough; it reads the latest definition.
    db.prepare(`
      DELETE FROM homework_jobs
      WHERE kind = 'prepare_expected' AND homework_id = ? AND status = 'queued'
    `).run(homeworkId);

    const now = Date.now();
    db.prepare(`
      INSERT INTO homework_jobs (kind, homework_id, status, available_at, created_at)
      VALUES ('prepare_expected', ?, 'queued', ?, ?)
    `).run(homeworkId, now, now);

    db.prepare(`
      UPDATE homework SET prep_status = 'queued', prep_error = NULL WHERE id = ?
    `).run(homeworkId);
  }).immediate();
}

// ---------- queue loop ----------

let started = false;

export function startHomeworkQueue() {
  if (started) return;
  started = true;

  try {
    prepareLegacyHomework();
  } catch (error) {
    console.error("[Homework queue] Startup check failed:", error);
  }

  const tick = async () => {
    try {
      const job = claim();
      if (job) {
        await processJob(job);
        setTimeout(tick, 0).unref();
        return;
      }
    } catch (error) {
      console.error("[Homework queue]", error);
    }
    setTimeout(tick, POLL_MS).unref();
  };

  setTimeout(tick, 1_500).unref();
}

// Homework saved before the new grader (no definition hash yet) is prepared
// once automatically.
function prepareLegacyHomework() {
  const rows = getDb().prepare(`
    SELECT h.id FROM homework h
    WHERE h.definition_hash IS NULL
      AND EXISTS (SELECT 1 FROM homework_questions q WHERE q.homework_id = h.id)
  `).all() as { id: string }[];

  for (const { id } of rows) enqueueHomeworkPrepare(id);
}

function claim(): JobRow | null {
  const db = getDb();
  return db.transaction(() => {
    const job = db.prepare(`
      SELECT id, kind, homework_id, question_id, submission_id, attempts
      FROM homework_jobs
      WHERE status = 'queued' AND available_at <= ?
      ORDER BY id
      LIMIT 1
    `).get(Date.now()) as JobRow | undefined;

    if (!job) return null;

    db.prepare(`
      UPDATE homework_jobs
      SET status = 'running', attempts = attempts + 1, locked_at = ?
      WHERE id = ? AND status = 'queued'
    `).run(Date.now(), job.id);

    return job;
  }).immediate();
}

function finishJob(jobId: number, status: "complete" | "failed", error: string | null = null) {
  getDb().prepare(`
    UPDATE homework_jobs SET status = ?, error = ?, finished_at = ? WHERE id = ?
  `).run(status, error, Date.now(), jobId);
}

async function processJob(job: JobRow) {
  try {
    if (job.kind === "prepare_expected") {
      await prepare(job);
    } else {
      await grade(job);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Homework queue] Job ${job.id} failed:`, message);
    finishJob(job.id, "failed", message);

    if (job.kind === "grade_submission" && job.submission_id) {
      failSubmission(job.submission_id, "Grading could not finish. Your script was saved; please submit it again.");
    }
  }
}

// ---------- preparation ----------

class PrepareError extends Error {}

async function prepare(job: JobRow) {
  const db = getDb();
  const homework = loadHomework(job.homework_id);

  if (!homework) {
    finishJob(job.id, "complete", "Homework was deleted.");
    return;
  }

  const hash = definitionHash(homework);
  let log = "";
  let lastFlush = 0;
  const writeLog = db.prepare(`UPDATE homework SET prep_log = ? WHERE id = ?`);

  const append = (text: string, force = false) => {
    log += text;
    if (log.length > LOG_LIMIT * 2) log = log.slice(-LOG_LIMIT);
    if (force || Date.now() - lastFlush > 1_500) {
      lastFlush = Date.now();
      writeLog.run(log.slice(-LOG_LIMIT), homework.id);
    }
  };

  db.prepare(`
    UPDATE homework SET prep_status = 'preparing', prep_error = NULL, prep_log = '', definition_hash = ? WHERE id = ?
  `).run(hash, homework.id);

  try {
    if (homework.questions.length === 0) throw new PrepareError("Add at least one question.");

    // 1. Environment image (reused when the environment hasn't changed).
    append("== Building the grading environment ==\n", true);
    const env = await callGatewayStream(
      "/homework/build-env",
      { homeworkId: homework.id, envHash: environmentHash(homework.environment), environment: homework.environment },
      { timeoutMs: ENV_BUILD_TIMEOUT_MS, onLog: (text) => append(text) },
    );
    if (!env.ok || typeof env.image !== "string") {
      throw new PrepareError(`The environment could not be built: ${env.error ?? "unknown error"}`);
    }
    const image = env.image;

    // 2. Reference solution against every test.
    const expected = new Map<string, Observation>();

    for (const [qIndex, question] of homework.questions.entries()) {
      if (question.tests.length === 0) throw new PrepareError(`Question ${qIndex + 1} has no test cases.`);

      append(`\n== Question ${qIndex + 1}: running the reference solution on ${question.tests.length} test${question.tests.length === 1 ? "" : "s"} ==\n`, true);
      const observations = await runTests(image, question, question.solution, (text) => append(text));

      for (const [tIndex, test] of question.tests.entries()) {
        const where = `Question ${qIndex + 1}, test ${tIndex + 1}`;
        const result = observations[test.id];

        if (!result?.ran) throw new PrepareError(`${where}: the reference solution could not be run.`);
        if (result.setupExit !== null && result.setupExit !== 0) {
          throw new PrepareError(
            `${where}: the test's setup script failed (exit code ${result.setupExit}).\n${result.setupLog.trim()}`,
          );
        }
        if ((result.exitCode === 124 || result.exitCode === 137) && result.durationMs >= question.timeLimitSec * 1000 - 100) {
          throw new PrepareError(
            `${where}: the reference solution took longer than the ${question.timeLimitSec}s time limit. Raise the limit or fix the solution.`,
          );
        }

        const notes: string[] = [];
        if (result.exitCode !== 0) notes.push(`exit code ${result.exitCode}`);
        if (result.filesTruncated) notes.push("work folder over 512 KB (files won't be compared)");
        if (result.stderr.trim()) notes.push(`stderr: ${result.stderr.trim().split("\n")[0].slice(0, 120)}`);

        append(
          `  test ${tIndex + 1}: ${result.stdout.length} bytes of output, ${result.files.length} file(s), ${result.durationMs} ms` +
            (notes.length ? ` — note: ${notes.join("; ")}` : "") +
            "\n",
        );
        expected.set(test.id, result);
      }
    }

    // 3. Store expected results — unless the homework changed meanwhile.
    db.transaction(() => {
      const update = db.prepare(`UPDATE homework_test_cases SET expected_json = ? WHERE id = ? AND homework_id = ?`);
      for (const [testId, result] of expected) update.run(JSON.stringify(result), testId, homework.id);

      const current = db.prepare(`SELECT definition_hash FROM homework WHERE id = ?`).get(homework.id) as
        | { definition_hash: string | null }
        | undefined;

      db.prepare(`
        UPDATE homework
        SET prepared_hash = ?, env_image = ?, prepared_at = ?, prep_error = NULL,
            prep_status = CASE WHEN ? THEN 'ready' ELSE 'queued' END
        WHERE id = ?
      `).run(hash, image, Date.now(), current?.definition_hash === hash ? 1 : 0, homework.id);
    })();

    append("\nReady. Learners can submit now.\n", true);
    finishJob(job.id, "complete");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    append(`\nFAILED: ${message}\n`, true);
    db.prepare(`UPDATE homework SET prep_status = 'failed', prep_error = ? WHERE id = ?`).run(message.slice(0, 4_000), homework.id);
    finishJob(job.id, "failed", message);
  }
}

async function runTests(
  image: string,
  question: LoadedQuestion,
  script: string,
  onLog?: (text: string) => void,
): Promise<Record<string, Observation>> {
  const budgetMs = question.tests.length * (question.timeLimitSec + 40) * 1000 + 5 * 60_000;

  const result = await callGatewayStream(
    "/homework/run",
    {
      image,
      script,
      timeLimitSec: question.timeLimitSec,
      tests: question.tests.map((test) => ({ id: test.id, setup: test.setup, args: test.args, stdin: test.stdin })),
    },
    { timeoutMs: budgetMs, onLog },
  );

  if (!result.ok) throw new PrepareError(result.error || "The tests could not be run.");
  return (result.observations ?? {}) as Record<string, Observation>;
}

// ---------- grading ----------

function failSubmission(submissionId: number, message: string) {
  getDb().prepare(`
    UPDATE homework_submissions
    SET status = 'error', error = ?, finished_at = ?
    WHERE id = ? AND status = 'pending'
  `).run(message, Date.now(), submissionId);
}

type SubmissionRow = { id: number; code: string; question_id: string | null; status: string };

async function grade(job: JobRow) {
  const db = getDb();

  const submission = db.prepare(`
    SELECT id, code, question_id, status FROM homework_submissions WHERE id = ?
  `).get(job.submission_id) as SubmissionRow | undefined;

  if (!submission || submission.status !== "pending") {
    finishJob(job.id, "complete");
    return;
  }

  const homework: LoadedHomework | null = loadHomework(job.homework_id);
  const question = homework?.questions.find((q) => q.id === (job.question_id ?? submission.question_id));

  if (!homework || !question) {
    failSubmission(submission.id, "This assignment no longer exists.");
    finishJob(job.id, "complete");
    return;
  }

  if (!isReady(homework) || question.tests.some((test) => !test.expected)) {
    failSubmission(submission.id, "This assignment was changed while your script was waiting. Please submit it again.");
    finishJob(job.id, "complete");
    return;
  }

  let observations: Record<string, Observation>;
  try {
    observations = await runTests(homework.envImage!, question, submission.code);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // The gateway may be restarting: retry once after a short pause.
    if (job.attempts < 2 && /reach the lab gateway|interrupted|closed the connection/.test(message)) {
      db.prepare(`UPDATE homework_jobs SET status = 'queued', available_at = ?, error = ? WHERE id = ?`)
        .run(Date.now() + 15_000, message, job.id);
      return;
    }
    failSubmission(submission.id, `Grading could not finish: ${message} Your script was saved; please submit it again.`);
    finishJob(job.id, "failed", message);
    return;
  }

  const results: TestFeedback[] = question.tests.map((test, index) =>
    compareTest({
      testId: test.id,
      index,
      hidden: test.hidden,
      points: test.xp,
      timeLimitSec: question.timeLimitSec,
      compare: question.compare,
      expected: test.expected!,
      actual: observations[test.id],
      input: { args: test.args, stdin: test.stdin },
    }),
  );

  const passedTests = results.filter((result) => result.passed).length;
  const allPassed = passedTests === results.length;
  const awarded = results.reduce((sum, result) => sum + result.points, 0) + (allPassed ? question.bonusXp : 0);
  const total = questionTotal(question);

  // Totals are refreshed so XP edits made after submitting can't violate the
  // table's awarded <= total checks.
  const totalPoints = Math.max(1, total);

  db.prepare(`
    UPDATE homework_submissions
    SET status = 'graded', passed_tests = ?, awarded_xp = ?, total_points = ?, total_tests = ?,
        results_json = ?, finished_at = ?, error = NULL
    WHERE id = ?
  `).run(
    passedTests,
    Math.min(awarded, totalPoints),
    totalPoints,
    results.length,
    JSON.stringify(results),
    Date.now(),
    submission.id,
  );

  finishJob(job.id, "complete");
}
