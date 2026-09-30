"use server";

import { Buffer } from "node:buffer";
import {
  lessons,
  type HomeworkContentBlock,
} from "@/content/lessons";
import type { HomeworkGradeResponse } from "@/lib/homework-types";

export async function gradeHomeworkScript(
  scriptContent: string,
  homeworkId: string,
): Promise<HomeworkGradeResponse> {
  // AUTH INTEGRATION:
  // Run your existing server-side session/authorization check here.
  // Authorize the current user before contacting the gateway.

  if (
    typeof scriptContent !== "string" ||
    typeof homeworkId !== "string" ||
    homeworkId.length > 120 ||
    Buffer.byteLength(scriptContent, "utf8") > 32 * 1024
  ) {
    return { ok: false, error: "Invalid submission or script exceeds 32 KiB." };
  }

  const normalizedScript = scriptContent
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");

  if (!normalizedScript.trim() || normalizedScript.includes("\0")) {
    return { ok: false, error: "Upload a nonempty UTF-8 Bash script." };
  }

  const matches = lessons
    .flatMap((lesson) => lesson.blocks)
    .filter(
      (block): block is HomeworkContentBlock =>
        block.type === "homework" && block.homeworkId === homeworkId,
    );

  if (matches.length !== 1) {
    return { ok: false, error: "This homework assignment is unavailable." };
  }

  const homework = matches[0];
  const token = process.env.GRADER_INTERNAL_TOKEN;
  const endpoint = process.env.GRADER_INTERNAL_URL;

  if (!token || !endpoint) {
    return { ok: false, error: "The homework grader is not configured." };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        scriptContent: normalizedScript,
        homeworkId: homework.homeworkId,
        totalPoints: homework.totalPoints,
        testCases: homework.testCases,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(35_000),
    });

    const result = (await response.json()) as HomeworkGradeResponse;

    if (!response.ok || !result.ok) {
      return {
        ok: false,
        error: !result.ok
          ? result.error
          : "The grader could not complete this submission.",
      };
    }

    return result;
  } catch {
    return {
      ok: false,
      error: "The grader is unavailable or timed out. Please try again.",
    };
  }
}
