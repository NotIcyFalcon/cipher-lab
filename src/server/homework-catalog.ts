import "server-only";

import { z } from "zod";
import type { HomeworkQuestion } from "@/lib/progress-types";
import { getDb } from "@/server/db";

const scriptSchema = z.string().refine(
  (value) =>
    !value.includes("\0") &&
    Buffer.byteLength(value, "utf8") <= 64 * 1024,
  "Invalid script.",
);

const testSchema = z.object({
  id: z.string().min(1).max(200),
  setupScript: scriptSchema,
  xpReward: z.number().int().min(0).max(1_000_000),
  hidden: z.boolean(),
  expectedOutput: z.string().nullable().optional(),
  expectedFolder: z.string().nullable().optional(),
});

const definitionSchema = z.object({
  homeworkId: z.string().min(1).max(200),
  pathId: z.string().min(1).max(200),
  title: z.string(),
  objective: z.string(),
  setupScript: z.union([scriptSchema, z.literal("")]).nullable().optional(),
  baseXp: z.number().int().min(0).max(1_000_000),
  standardSolution: scriptSchema.refine((value) => Boolean(value.trim())),
  testCases: z.array(testSchema).min(1).max(100),
});

export type HomeworkDefinition = z.infer<typeof definitionSchema> & {
  totalPoints: number;
};

export function findHomework(homeworkId: string): HomeworkDefinition | undefined {
  const db = getDb();

  const row = db.prepare(`
    SELECT
      id AS homeworkId,
      path_id AS pathId,
      title,
      question_markdown AS objective,
      setup_script AS setupScript,
      total_base_xp AS baseXp,
      standard_solution_script AS standardSolution
    FROM homework
    WHERE id = ?
  `).get(homeworkId) as Record<string, unknown> | undefined;

  if (!row) return undefined;

  const tests = db.prepare(`
    SELECT
      id,
      setup_script AS setupScript,
      xp_reward AS xpReward,
      is_hidden AS hidden,
      expected_output AS expectedOutput,
      expected_folder AS expectedFolder
    FROM homework_test_cases
    WHERE homework_id = ?
    ORDER BY sequence_order, id
  `).all(homeworkId) as Array<{
    id: string;
    setupScript: string;
    xpReward: number;
    hidden: number;
    expectedOutput: string | null;
    expectedFolder: string | null;
  }>;

  const parsed = definitionSchema.safeParse({
    ...row,
    testCases: tests.map((test) => ({
      ...test,
      hidden: test.hidden === 1,
    })),
  });

  if (!parsed.success) return undefined;

  const totalPoints = parsed.data.baseXp +
    parsed.data.testCases.reduce((sum, test) => sum + test.xpReward, 0);

  if (!Number.isSafeInteger(totalPoints) || totalPoints <= 0) return undefined;

  return { ...parsed.data, totalPoints };
}

export function isHomeworkPathUnlocked(userId: string, pathId: string) {
  const row = getDb().prepare(`
    SELECT
      EXISTS (
        SELECT 1 FROM learning_paths WHERE id = @pathId
      ) AS path_exists,
      (SELECT COUNT(*) FROM chapters WHERE path_id = @pathId) AS chapters,
      (
        SELECT COUNT(*)
        FROM chapters c
        JOIN reading_progress r
          ON r.lesson_id = c.id AND r.user_id = @userId
        WHERE c.path_id = @pathId
      ) AS completed
  `).get({ userId, pathId }) as {
    path_exists: number;
    chapters: number;
    completed: number;
  };

  return row.path_exists === 1 &&
    row.chapters > 0 &&
    row.completed === row.chapters;
}

export function assertHomeworkAccess(userId: string, homeworkId: string) {
  const row = getDb().prepare(`
    SELECT path_id AS pathId FROM homework WHERE id = ?
  `).get(homeworkId) as { pathId: string } | undefined;

  if (!row || !isHomeworkPathUnlocked(userId, row.pathId)) {
    throw new Error("Read every chapter in this learning path first.");
  }
}

export function publicQuestion(question: HomeworkDefinition): HomeworkQuestion {
  const testXp = question.testCases.reduce(
    (sum, test) => sum + test.xpReward,
    0,
  );

  return {
    homeworkId: question.homeworkId,
    title: question.title,
    objective: question.objective,
    baseXp: question.baseXp,
    testXp,
    totalPoints: question.totalPoints,
    totalTests: question.testCases.length,
  };
}
