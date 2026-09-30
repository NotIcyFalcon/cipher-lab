"use server";

import { z } from "zod";
import { getDb } from "@/server/db";
import { requireRonakId } from "@/server/current-user";
import { findHomework } from "@/server/homework-catalog";
import { runGrader } from "@/server/run-grader";
import { getHistory, getSubmission } from "@/server/progress";
import { refreshProgress } from "@/server/refresh-progress";
import type {
  HistoryPage,
  Submission,
} from "@/lib/progress-types";

type GradeReply =
  | { ok: true; submission: Submission }
  | { ok: false; error: string };

export async function gradeHomework(
  formData: FormData,
): Promise<GradeReply> {
  const userId = await requireRonakId();

  const homeworkId = formData.get("homeworkId");
  const file = formData.get("file");

  if (typeof homeworkId !== "string") {
    return { ok: false, error: "Select a homework question." };
  }

  const question = findHomework(homeworkId);

  if (!question) {
    return { ok: false, error: "Unknown homework question." };
  }

  if (
    !(file instanceof File) ||
    !file.name.toLowerCase().endsWith(".sh") ||
    file.name.length > 180 ||
    file.size === 0 ||
    file.size > 64 * 1024
  ) {
    return {
      ok: false,
      error: "Upload a nonempty .sh file no larger than 64 KB.",
    };
  }

  let code: string;

  try {
    code = new TextDecoder("utf-8", { fatal: true }).decode(
      await file.arrayBuffer(),
    );
  } catch {
    return { ok: false, error: "The script must contain valid UTF-8 text." };
  }

  if (code.includes("\0")) {
    return { ok: false, error: "The script contains invalid text." };
  }

  const db = getDb();

  const inserted = db.prepare(`
    INSERT INTO homework_submissions (
      user_id,
      homework_id,
      filename,
      code,
      total_points,
      total_tests,
      created_at
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

  const submissionId = Number(inserted.lastInsertRowid);

  let grade: Awaited<ReturnType<typeof runGrader>> | undefined;

  try {
    grade = await runGrader(question, code);
  } catch (error) {
    console.error("Homework grading failed:", error);

    db.prepare(`
      UPDATE homework_submissions
      SET status = 'error',
          error = ?,
          finished_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      "Grading could not finish. Your script was saved; please submit again.",
      Date.now(),
      submissionId,
      userId,
    );
  }

  if (grade) {
    db.prepare(`
      UPDATE homework_submissions
      SET status = 'graded',
          passed_tests = ?,
          awarded_xp = ?,
          results_json = ?,
          finished_at = ?,
          error = NULL
      WHERE id = ? AND user_id = ?
    `).run(
      grade.passedTests,
      grade.awardedXp,
      JSON.stringify(grade.results),
      Date.now(),
      submissionId,
      userId,
    );
  }

  refreshProgress();

  const submission = getSubmission(userId, submissionId);
  if (!submission) throw new Error("Saved submission could not be read");

  return { ok: true, submission };
}

export async function listHomeworkSubmissions(
  homeworkId: string,
  beforeId?: number,
): Promise<HistoryPage> {
  const userId = await requireRonakId();
  const id = z.string().min(1).max(200).parse(homeworkId);
  const cursor = z.number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .optional()
    .parse(beforeId);

  return getHistory(userId, id, cursor);
}

export async function readHomeworkSubmission(
  submissionId: number,
): Promise<Submission> {
  const userId = await requireRonakId();
  const id = z.number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .parse(submissionId);

  const submission = getSubmission(userId, id);
  if (!submission) {
    throw new Error("Submission not found");
  }

  return submission;
}
