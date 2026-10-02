import "server-only";

import { z } from "zod";
import type { HomeworkDefinition } from "@/server/homework-catalog";
import type { TestResult } from "@/lib/progress-types";

const resultSchema = z.object({
  id: z.string().min(1).max(200),
  passed: z.boolean(),
  expectedOutput: z.string().max(2048),
  actualOutput: z.string().max(2048),
  stderr: z.string().max(2048),
  expectedFolder: z.string().max(1000),
  actualFolder: z.string().max(1000),
  error: z.string().max(300),
});

const responseSchema = z.object({
  passedTests: z.number().int().min(0).max(100),
  totalPoints: z.number().int().positive(),
  awardedXp: z.number().int().nonnegative(),
  results: z.array(resultSchema).min(1).max(100),
});

async function boundedJson(response: Response): Promise<unknown> {
  if (!response.body) throw new Error("Empty grader response.");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;

      size += item.value.byteLength;

      if (size > 2 * 1024 * 1024) {
        await reader.cancel();
        throw new Error("Grader response exceeded its limit.");
      }

      chunks.push(item.value);
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

  if (!token || token.length < 32) {
    throw new Error("Missing grader authentication configuration.");
  }

  const response = await fetch(
    process.env.GRADER_INTERNAL_URL ??
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
        scriptContent: script,
        standardSolution: question.standardSolution,
        baseXp: question.baseXp,
        totalPoints: question.totalPoints,
        testCases: question.testCases,
      }),
      signal: AbortSignal.timeout(920_000),
    },
  );

  if (!response.ok) throw new Error("Grader request failed.");

  const grade = responseSchema.parse(await boundedJson(response));

  if (
    grade.totalPoints !== question.totalPoints ||
    grade.results.length !== question.testCases.length
  ) {
    throw new Error("Inconsistent grading response.");
  }

  let awardedXp = 0;

  const results: TestResult[] = grade.results.map((result, index) => {
    const test = question.testCases[index];

    if (result.id !== test.id) {
      throw new Error("Grader returned tests in an unexpected order.");
    }

    if (result.passed) awardedXp += test.xpReward;

    // Project explicitly. Never persist hidden output in submission history.
    return {
      publicVersion: 8,
      testId: test.id,
      name: test.hidden ? `Hidden test ${index + 1}` : `Test ${index + 1}`,
      passed: result.passed,
      points: result.passed ? test.xpReward : 0,
      maxPoints: test.xpReward,
      hidden: test.hidden,
      assertionType: "folder",
      expectedOutput: test.hidden ? "[Hidden]" : result.expectedOutput,
      actualOutput: test.hidden ? "[Hidden]" : result.actualOutput,
      expectedFolder: test.hidden ? "[Hidden]" : result.expectedFolder,
      actualFolder: test.hidden ? "[Hidden]" : result.actualFolder,
      stderr: test.hidden ? "" : result.stderr,
      error: test.hidden ? "" : result.error,
    };
  });

  const passedTests = results.filter((result) => result.passed).length;

  if (passedTests === question.testCases.length) {
    awardedXp += question.baseXp;
  }

  if (
    grade.passedTests !== passedTests ||
    grade.awardedXp !== awardedXp
  ) {
    throw new Error("Inconsistent grader score.");
  }

  return { passedTests, awardedXp, results };
}
