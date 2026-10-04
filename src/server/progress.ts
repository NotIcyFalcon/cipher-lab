import "server-only";

import { getDb } from "@/server/db";
import { sanitizeSubmissionResults } from "@/server/submission-results";
import type {
  HistoryPage,
  Progress,
  Submission,
  SubmissionSummary,
} from "@/lib/progress-types";

export function getCTFProgress(
  userId: string,
): Pick<Progress, "ctfXp" | "ctfIds"> {
  const rows = getDb()
    .prepare(`
      SELECT
        challenge_id AS challengeId,
        awarded_xp AS xp
      FROM ctf_completions
      WHERE user_id = ?
      ORDER BY completed_at, challenge_id
    `)
    .all(userId) as Array<{ challengeId: string; xp: number }>;

  return {
    ctfXp: rows.reduce((total, row) => total + row.xp, 0),
    ctfIds: rows.map((row) => row.challengeId),
  };
}

export function getProgress(userId: string): Progress {
  const db = getDb();

  const totals = db
    .prepare(`
      SELECT
        reading_xp AS readingXp,
        labs_xp AS labsXp,
        homework_xp AS homeworkXp,
        ctf_xp AS ctfXp,
        reading_xp + labs_xp + homework_xp + ctf_xp AS totalXp
      FROM user_xp
      WHERE user_id = ?
    `)
    .get(userId) as
    | Pick<
        Progress,
        "readingXp" | "labsXp" | "homeworkXp" | "ctfXp" | "totalXp"
      >
    | undefined;

  if (!totals) throw new Error("User not found");

  const reading = db
    .prepare(`
      SELECT lesson_id AS id
      FROM reading_progress
      WHERE user_id = ?
    `)
    .all(userId) as { id: string }[];

  const labs = db
    .prepare(`
      SELECT challenge_id AS id
      FROM lab_completions
      WHERE user_id = ?
    `)
    .all(userId) as { id: string }[];

  const homework = db
    .prepare(`
      SELECT homework_id AS id, best_xp AS xp
      FROM homework_best
      WHERE user_id = ?
    `)
    .all(userId) as { id: string; xp: number }[];

  const questionBest = db
    .prepare(`
      SELECT question_id AS id, best_xp AS xp
      FROM homework_question_best
      WHERE user_id = ? AND question_id IS NOT NULL
    `)
    .all(userId) as { id: string; xp: number }[];

  const ctf = getCTFProgress(userId);

  return {
    ...totals,
    readingIds: reading.map((item) => item.id),
    labIds: labs.map((item) => item.id),
    homeworkBest: Object.fromEntries(
      homework.map((item) => [item.id, item.xp]),
    ),
    homeworkQuestionBest: Object.fromEntries(
      questionBest.map((item) => [item.id, item.xp]),
    ),
    ...ctf,
  };
}

const summaryColumns = `
  id,
  created_at AS createdAt,
  status,
  awarded_xp AS awardedXp,
  total_points AS totalPoints,
  passed_tests AS passedTests,
  total_tests AS totalTests
`;

export function getSubmission(
  userId: string,
  submissionId: number,
): Submission | null {
  const row = getDb()
    .prepare(`
      SELECT
        ${summaryColumns},
        homework_id AS homeworkId,
        question_id AS questionId,
        filename,
        code,
        results_json AS resultsJson,
        error
      FROM homework_submissions
      WHERE id = ? AND user_id = ?
    `)
    .get(submissionId, userId) as
    | (Omit<Submission, "results"> & { resultsJson: string })
    | undefined;

  if (!row) return null;

  const { resultsJson, ...submission } = row;

  let results: unknown = [];
  try {
    results = JSON.parse(resultsJson);
  } catch {
    results = [];
  }

  return {
    ...submission,
    // Hidden tests never reveal expected/actual details, even for old rows.
    results: sanitizeSubmissionResults(results),
  };
}

export function getHistory(
  userId: string,
  homeworkId: string,
  questionId: string,
  beforeId = Number.MAX_SAFE_INTEGER,
): HistoryPage {
  const rows = getDb()
    .prepare(`
      SELECT ${summaryColumns}
      FROM homework_submissions
      WHERE user_id = ?
        AND homework_id = ?
        AND (question_id = ? OR question_id IS NULL)
        AND id < ?
      ORDER BY id DESC
      LIMIT 11
    `)
    .all(userId, homeworkId, questionId, beforeId) as SubmissionSummary[];

  const items = rows.slice(0, 10);

  return {
    items,
    nextCursor: rows.length > 10 ? items[items.length - 1].id : null,
  };
}
