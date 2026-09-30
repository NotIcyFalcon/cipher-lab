import "server-only";
import { z } from "zod";
import type { HomeworkDefinition } from "@/server/homework-catalog";
import type { TestResult } from "@/lib/progress-types";

const graderResponseSchema = z.object({
  passedTests: z.number().int().nonnegative(),
  totalPoints: z.number().int().positive(),
  awardedXp: z.number().int().nonnegative(),

  results: z.array(
    z.object({
      passed: z.boolean(),
      actualOutput: z.string().max(64 * 1024),
      name: z.string().optional(),
    }).passthrough(),
  ).max(100),
});

async function readBoundedJson(response: Response): Promise<unknown> {
  if (!response.body) throw new Error("Empty grader response");

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let bytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytes += value.byteLength;

      if (bytes > 1024 * 1024) {
        await reader.cancel();
        throw new Error("Grader response exceeded 1 MB");
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function runGrader(
  question: HomeworkDefinition,
  script: string,
) {
  const token = process.env.GRADER_INTERNAL_TOKEN;
  if (!token) throw new Error("Missing grader authentication configuration");

  const response = await fetch(
    process.env.GRADER_INTERNAL_URL ||
      "http://gateway:3002/grade-homework",
    {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        homeworkId: question.homeworkId,
        scriptContent: script, // our grader uses scriptContent
        totalPoints: question.totalPoints,
        testCases: question.testCases,
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Grader returned HTTP ${response.status}`);
  }

  const result = await readBoundedJson(response);
  const grade = graderResponseSchema.parse(result);

  if (
    grade.totalPoints !== question.totalPoints ||
    grade.results.length !== question.testCases.length ||
    grade.passedTests !== grade.results.filter((r) => r.passed).length ||
    grade.awardedXp > question.totalPoints
  ) {
    throw new Error("Inconsistent grader response");
  }

  const results: TestResult[] = grade.results.map((r, index) => ({
    ...r,
    name: r.name || `Test ${index + 1}`,
    expectedOutput: question.testCases[index].expectedOutput,
  }));

  return {
    passedTests: grade.passedTests,
    awardedXp: grade.awardedXp,
    results,
  };
}
