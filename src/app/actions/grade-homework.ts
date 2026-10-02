"use server";

import { z } from "zod";
import { getDb } from "@/server/db";
import { requireUserId } from "@/server/current-user";
import {
  assertHomeworkAccess,
  findHomework,
} from "@/server/homework-catalog";
import { runGrader } from "@/server/run-grader";
import { getHistory, getSubmission } from "@/server/progress";
import { refreshProgress } from "@/server/refresh-progress";
import type { HistoryPage, Submission } from "@/lib/progress-types";

type GradeReply =
  | { ok: true; submission: Submission }
  | { ok: false; error: string };

export async function gradeHomework(formData: FormData): Promise<GradeReply> {
  const userId = await requireUserId();

  const parsedId = z.string().min(1).max(200).safeParse(
    formData.get("homeworkId"),
  );

  if (!parsedId.success) {
    return { ok: false, error: "Select a homework question." };
  }

  const file = formData.get("file");

  if (
    !(file instanceof File) ||
    !file.name.toLowerCase().endsWith(".sh") ||
    file.name.length > 180 ||
    file.size === 0 ||
    file.size > 64 * 1024
  ) {
    return {
      ok: false,
      error: "Upload a nonempty UTF-8 .sh file no larger than 64 KiB.",
    };
  }

  let code: string;

  try {
    code = new TextDecoder("utf-8", { fatal: true }).decode(
      await file.arrayBuffer(),
    );
  } catch {
    return { ok: false, error: "The file must contain valid UTF-8." };
  }

  if (!code.trim() || code.includes("\0")) {
    return { ok: false, error: "The script is empty or contains invalid text." };
  }

  const db = getDb();

  let snapshot: {
    id: number;
    question: NonNullable<ReturnType<typeof findHomework>>;
  };

  try {
    snapshot = db.transaction(() => {
      assertHomeworkAccess(userId, parsedId.data);

      const question = findHomework(parsedId.data);
      if (!question) throw new Error("This assignment is not ready for grading.");

      const pending = db.prepare(`
        SELECT id
        FROM homework_submissions
        WHERE user_id = ?
          AND status = 'pending'
          AND created_at > ?
        LIMIT 1
      `).get(userId, Date.now() - 20 * 60_000);

      if (pending) {
        throw new Error("Your previous submission is still being graded.");
      }

      const result = db.prepare(`
        INSERT INTO homework_submissions (
          user_id, homework_id, filename, code,
          total_points, total_tests, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        question.homeworkId,
        file.name,
        code,
        question.totalPoints,
        question.testCases.length,
        Date.now(),
      );

      return {
        id: Number(result.lastInsertRowid),
        question,
      };
    }).immediate();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Submission rejected.",
    };
  }

  try {
    const grade = await runGrader(snapshot.question, code);

    db.prepare(`
      UPDATE homework_submissions
      SET status = 'graded',
          passed_tests = ?,
          awarded_xp = ?,
          results_json = ?,
          finished_at = ?,
          error = NULL
      WHERE id = ? AND user_id = ? AND status = 'pending'
    `).run(
      grade.passedTests,
      grade.awardedXp,
      JSON.stringify(grade.results),
      Date.now(),
      snapshot.id,
      userId,
    );
  } catch {
    // Do not log scripts, reference solutions, or hidden diagnostics.
    db.prepare(`
      UPDATE homework_submissions
      SET status = 'error',
          error = ?,
          finished_at = ?
      WHERE id = ? AND user_id = ? AND status = 'pending'
    `).run(
      "Grading could not finish. Your script was saved; please retry.",
      Date.now(),
      snapshot.id,
      userId,
    );
  }

  refreshProgress();

  const submission = getSubmission(userId, snapshot.id);
  if (!submission) throw new Error("Saved submission could not be read.");

  return { ok: true, submission };
}

export async function listHomeworkSubmissions(
  homeworkId: string,
  beforeId?: number,
): Promise<HistoryPage> {
  const userId = await requireUserId();
  const id = z.string().min(1).max(200).parse(homeworkId);

  const cursor = z.number().int().positive()
    .max(Number.MAX_SAFE_INTEGER).optional().parse(beforeId);

  assertHomeworkAccess(userId, id);
  return getHistory(userId, id, cursor);
}

export async function readHomeworkSubmission(
  submissionId: number,
): Promise<Submission> {
  const userId = await requireUserId();
  const id = z.number().int().positive()
    .max(Number.MAX_SAFE_INTEGER).parse(submissionId);

  const submission = getSubmission(userId, id);
  if (!submission) throw new Error("Submission not found.");

  assertHomeworkAccess(userId, submission.homeworkId);
  return submission;
}
