"use server";

import { z } from "zod";
import { getDb } from "@/server/db";
import { requireUserId } from "@/server/current-user";
import {
  assertHomeworkAccess,
  isReady,
  loadHomework,
  questionTotal,
} from "@/server/homework-catalog";
import { getHistory, getSubmission } from "@/server/progress";
import type { HistoryPage, Submission } from "@/lib/progress-types";

type GradeReply =
  | { ok: true; submission: Submission }
  | { ok: false; error: string };

const idSchema = z.string().min(1).max(200);
const MAX_SCRIPT = 64 * 1024;

async function readScript(formData: FormData): Promise<{ code: string; filename: string } | { error: string }> {
  const file = formData.get("file");
  const pasted = formData.get("script");

  if (file instanceof File && file.size > 0) {
    if (!file.name.toLowerCase().endsWith(".sh") || file.name.length > 180 || file.size > MAX_SCRIPT) {
      return { error: "Upload a .sh file no larger than 64 KB." };
    }
    try {
      const code = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      return { code, filename: file.name };
    } catch {
      return { error: "The file must contain valid UTF-8 text." };
    }
  }

  if (typeof pasted === "string" && pasted.trim()) {
    if (Buffer.byteLength(pasted, "utf8") > MAX_SCRIPT) {
      return { error: "Scripts are limited to 64 KB." };
    }
    return { code: pasted, filename: "solution.sh" };
  }

  return { error: "Choose a .sh file or paste your script." };
}

export async function gradeHomework(formData: FormData): Promise<GradeReply> {
  const userId = await requireUserId();

  const homeworkId = idSchema.safeParse(formData.get("homeworkId"));
  const questionId = idSchema.safeParse(formData.get("questionId"));
  if (!homeworkId.success || !questionId.success) {
    return { ok: false, error: "Select a homework question." };
  }

  const script = await readScript(formData);
  if ("error" in script) return { ok: false, error: script.error };

  // Windows line endings make bash fail with "$'\r': command not found".
  const code = script.code.replace(/\r\n/g, "\n");
  if (!code.trim() || code.includes("\0")) {
    return { ok: false, error: "The script is empty or contains invalid characters." };
  }

  const db = getDb();
  let submissionId: number;

  try {
    submissionId = db.transaction(() => {
      assertHomeworkAccess(userId, homeworkId.data);

      const homework = loadHomework(homeworkId.data);
      const question = homework?.questions.find((q) => q.id === questionId.data);
      if (!homework || !question || question.tests.length === 0) {
        throw new Error("This question is not available.");
      }

      if (!isReady(homework)) {
        throw new Error(
          homework.prepStatus === "failed"
            ? "This assignment isn't available yet. The owner needs to fix it."
            : "This assignment is still being prepared. Try again in a minute.",
        );
      }

      const pending = db.prepare(`
        SELECT id FROM homework_submissions
        WHERE user_id = ? AND question_id = ? AND status = 'pending' AND created_at > ?
        LIMIT 1
      `).get(userId, question.id, Date.now() - 20 * 60_000);

      if (pending) throw new Error("Your previous submission for this question is still being graded.");

      const now = Date.now();
      const inserted = db.prepare(`
        INSERT INTO homework_submissions (
          user_id, homework_id, question_id, filename, code,
          total_points, total_tests, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        homework.id,
        question.id,
        script.filename,
        code,
        Math.max(1, questionTotal(question)),
        question.tests.length,
        now,
      );

      const id = Number(inserted.lastInsertRowid);

      db.prepare(`
        INSERT INTO homework_jobs (kind, homework_id, question_id, submission_id, status, available_at, created_at)
        VALUES ('grade_submission', ?, ?, ?, 'queued', ?, ?)
      `).run(homework.id, question.id, id, now, now);

      return id;
    }).immediate();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Submission rejected." };
  }

  const submission = getSubmission(userId, submissionId);
  if (!submission) return { ok: false, error: "Your submission was saved but could not be read back." };

  return { ok: true, submission };
}

export async function listHomeworkSubmissions(
  homeworkId: string,
  questionId: string,
  beforeId?: number,
): Promise<HistoryPage> {
  const userId = await requireUserId();
  const hw = idSchema.parse(homeworkId);
  const question = idSchema.parse(questionId);
  const cursor = z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional().parse(beforeId);

  assertHomeworkAccess(userId, hw);
  return getHistory(userId, hw, question, cursor);
}

export async function readHomeworkSubmission(submissionId: number): Promise<Submission> {
  const userId = await requireUserId();
  const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER).parse(submissionId);

  const submission = getSubmission(userId, id);
  if (!submission) throw new Error("Submission not found.");

  assertHomeworkAccess(userId, submission.homeworkId);
  return submission;
}
