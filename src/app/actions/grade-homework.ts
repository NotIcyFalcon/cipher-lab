"use server";

import { z } from "zod";
import { getDb } from "@/server/db";
import { requireUserId } from "@/server/current-user";
import {
  assertHomeworkAccess,
  findHomework,
} from "@/server/homework-catalog";
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
  
  const parsedQuestionId = z.string().min(1).max(200).safeParse(
    formData.get("questionId"),
  );

  if (!parsedId.success || !parsedQuestionId.success) {
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

      const question = findHomework(parsedId.data, parsedQuestionId.data);
      if (!question) throw new Error("This assignment is not ready for grading.");

      const pending = db.prepare(`
        SELECT id
        FROM homework_submissions
        WHERE user_id = ?
          AND homework_id = ?
          AND status = 'pending'
          AND created_at > ?
        LIMIT 1
      `).get(userId, parsedId.data, Date.now() - 20 * 60_000);

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
      
      const submissionId = Number(result.lastInsertRowid);
      
      db.prepare(`
        INSERT INTO homework_jobs (
          kind, homework_id, question_id, submission_id, status, available_at, created_at
        ) VALUES (
          'grade_submission', ?, ?, ?, 'queued', ?, ?
        )
      `).run(
        question.homeworkId,
        question.questionId,
        submissionId,
        Date.now(),
        Date.now()
      );

      return {
        id: submissionId,
        question,
      };
    }).immediate();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Submission rejected.",
    };
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
