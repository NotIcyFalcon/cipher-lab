import "server-only";

import { createHash } from "node:crypto";
import { getDb } from "@/server/db";
import {
  bonusShares,
  parseCompare,
  parseEnvironment,
  type CompareOptions,
  type HomeworkEnvironment,
} from "@/lib/homework-recipe";
import type { Observation } from "@/lib/homework-results";
import type { HomeworkExample, HomeworkQuestion } from "@/lib/progress-types";

type HomeworkRow = {
  id: string;
  path_id: string;
  title: string;
  total_base_xp: number;
  environment_json: string;
  definition_hash: string | null;
  prepared_hash: string | null;
  prep_status: string;
  env_image: string | null;
};

type QuestionRow = {
  id: string;
  title: string;
  question_markdown: string;
  standard_solution_script: string;
  time_limit_sec: number;
  compare_json: string;
};

type TestRow = {
  id: string;
  question_id: string;
  setup_script: string;
  args: string;
  stdin: string;
  xp_reward: number;
  is_hidden: number;
  expected_json: string | null;
};

export type LoadedTest = {
  id: string;
  setup: string;
  args: string;
  stdin: string;
  xp: number;
  hidden: boolean;
  expected: Observation | null;
};

export type LoadedQuestion = {
  id: string;
  title: string;
  objective: string;
  solution: string;
  timeLimitSec: number;
  compare: CompareOptions;
  bonusXp: number;
  tests: LoadedTest[];
};

export type LoadedHomework = {
  id: string;
  pathId: string;
  title: string;
  bonusXp: number;
  environment: HomeworkEnvironment;
  definitionHash: string | null;
  preparedHash: string | null;
  prepStatus: string;
  envImage: string | null;
  questions: LoadedQuestion[];
};

function parseObservation(json: string | null): Observation | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as Observation;
  } catch {
    return null;
  }
}

export function loadHomework(homeworkId: string): LoadedHomework | null {
  const db = getDb();

  const row = db.prepare(`
    SELECT id, path_id, title, total_base_xp, environment_json, definition_hash,
           prepared_hash, prep_status, env_image
    FROM homework WHERE id = ?
  `).get(homeworkId) as HomeworkRow | undefined;
  if (!row) return null;

  const questions = db.prepare(`
    SELECT id, title, question_markdown, standard_solution_script, time_limit_sec, compare_json
    FROM homework_questions
    WHERE homework_id = ?
    ORDER BY sequence_order, id
  `).all(homeworkId) as QuestionRow[];

  const tests = db.prepare(`
    SELECT id, question_id, setup_script, args, stdin, xp_reward, is_hidden, expected_json
    FROM homework_test_cases
    WHERE homework_id = ?
    ORDER BY sequence_order, id
  `).all(homeworkId) as TestRow[];

  const shares = bonusShares(row.total_base_xp, questions.length);

  return {
    id: row.id,
    pathId: row.path_id,
    title: row.title,
    bonusXp: row.total_base_xp,
    environment: parseEnvironment(row.environment_json),
    definitionHash: row.definition_hash,
    preparedHash: row.prepared_hash,
    prepStatus: row.prep_status,
    envImage: row.env_image,
    questions: questions.map((question, index) => ({
      id: question.id,
      title: question.title,
      objective: question.question_markdown,
      solution: question.standard_solution_script,
      timeLimitSec: question.time_limit_sec,
      compare: parseCompare(question.compare_json),
      bonusXp: shares[index] ?? 0,
      tests: tests
        .filter((test) => test.question_id === question.id)
        .map((test) => ({
          id: test.id,
          setup: test.setup_script,
          args: test.args,
          stdin: test.stdin,
          xp: test.xp_reward,
          hidden: test.is_hidden === 1,
          expected: parseObservation(test.expected_json),
        })),
    })),
  };
}

/**
 * Hash of everything that changes the reference solution's results: the
 * environment, each solution and time limit, and each test's setup,
 * arguments and input. Titles, XP, hidden flags and comparison options don't
 * need a new preparation.
 */
export function definitionHash(homework: Pick<LoadedHomework, "environment" | "questions">): string {
  const material = {
    environment: homework.environment,
    questions: homework.questions.map((question) => ({
      id: question.id,
      solution: question.solution,
      timeLimitSec: question.timeLimitSec,
      tests: question.tests.map((test) => ({ id: test.id, setup: test.setup, args: test.args, stdin: test.stdin })),
    })),
  };
  return createHash("sha256").update(JSON.stringify(material)).digest("hex");
}

export function environmentHash(environment: HomeworkEnvironment): string {
  return createHash("sha256").update(JSON.stringify(environment)).digest("hex");
}

export function isReady(homework: Pick<LoadedHomework, "prepStatus" | "preparedHash" | "definitionHash" | "envImage">) {
  return (
    homework.prepStatus === "ready" &&
    Boolean(homework.envImage) &&
    homework.definitionHash !== null &&
    homework.preparedHash === homework.definitionHash
  );
}

export function questionTotal(question: Pick<LoadedQuestion, "tests" | "bonusXp">) {
  return question.bonusXp + question.tests.reduce((sum, test) => sum + test.xp, 0);
}

// ---------- learner access ----------

export function isHomeworkPathUnlocked(userId: string, pathId: string) {
  const row = getDb().prepare(`
    SELECT
      EXISTS (SELECT 1 FROM learning_paths WHERE id = @pathId) AS path_exists,
      (SELECT COUNT(*) FROM chapters WHERE path_id = @pathId) AS chapters,
      (
        SELECT COUNT(*)
        FROM chapters c
        JOIN reading_progress r ON r.lesson_id = c.id AND r.user_id = @userId
        WHERE c.path_id = @pathId
      ) AS completed
  `).get({ userId, pathId }) as { path_exists: number; chapters: number; completed: number };

  // The admin can open every assignment (to test it); learners must finish
  // the path's reading first.
  if (userId === "admin") return row.path_exists === 1;

  return row.path_exists === 1 && row.chapters > 0 && row.completed === row.chapters;
}

export function assertHomeworkAccess(userId: string, homeworkId: string) {
  const row = getDb().prepare(`SELECT path_id AS pathId FROM homework WHERE id = ?`).get(homeworkId) as
    | { pathId: string }
    | undefined;

  if (!row || !isHomeworkPathUnlocked(userId, row.pathId)) {
    throw new Error("Read every chapter in this learning path first.");
  }
}

function examplesFor(question: LoadedQuestion): HomeworkExample[] {
  return question.tests
    .filter((test) => !test.hidden)
    .slice(0, 3)
    .map((test, index) => ({
      name: `Example ${index + 1}`,
      setup: test.setup.trim().slice(0, 2_000),
      args: test.args,
      stdin: test.stdin.slice(0, 2_000),
      expectedStdout: test.expected ? test.expected.stdout.slice(0, 2_000) : null,
    }));
}

/** Questions of every homework in a learning path, as learners see them. */
export function publicHomeworkForPath(pathId: string): HomeworkQuestion[] {
  const ids = getDb().prepare(`
    SELECT id FROM homework WHERE path_id = ? ORDER BY title, id
  `).all(pathId) as { id: string }[];

  const result: HomeworkQuestion[] = [];

  for (const { id } of ids) {
    const homework = loadHomework(id);
    if (!homework) continue;
    const ready = isReady(homework);

    for (const question of homework.questions) {
      if (question.tests.length === 0) continue;
      const testXp = question.tests.reduce((sum, test) => sum + test.xp, 0);

      result.push({
        homeworkId: homework.id,
        homeworkTitle: homework.title,
        questionId: question.id,
        title: question.title,
        objective: question.objective,
        baseXp: question.bonusXp,
        testXp,
        totalPoints: testXp + question.bonusXp,
        totalTests: question.tests.length,
        hiddenTests: question.tests.filter((test) => test.hidden).length,
        timeLimitSec: question.timeLimitSec,
        ready,
        preparing: !ready && homework.prepStatus !== "failed",
        examples: ready ? examplesFor(question) : [],
      });
    }
  }

  return result;
}
