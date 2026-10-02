import "server-only";

import type { TestResult } from "@/lib/progress-types";
import { getDb } from "@/server/db";

export function sanitizeSubmissionResults(
  homeworkId: string,
  input: unknown,
): TestResult[] {
  if (!Array.isArray(input)) return [];

  const tests = getDb().prepare(`
    SELECT id, is_hidden
    FROM homework_test_cases
    WHERE homework_id = ?
  `).all(homeworkId) as Array<{ id: string; is_hidden: number }>;

  const visible = new Set(
    tests.filter((test) => test.is_hidden === 0).map((test) => test.id),
  );

  return input.slice(0, 100).map((value, index) => {
    const row = value && typeof value === "object"
      ? value as Record<string, unknown>
      : {};

    const disclose =
      row.publicVersion === 8 &&
      row.hidden === false &&
      typeof row.testId === "string" &&
      visible.has(row.testId);

    const text = (key: string, limit: number) =>
      disclose && typeof row[key] === "string"
        ? row[key].slice(0, limit)
        : "";

    return {
      publicVersion: 8,
      testId: typeof row.testId === "string" ? row.testId : "",
      name: disclose ? `Test ${index + 1}` : `Hidden test ${index + 1}`,
      passed: row.passed === true,
      hidden: !disclose,
      assertionType: "folder",
      expectedOutput: disclose ? text("expectedOutput", 2048) : "[Hidden]",
      actualOutput: disclose ? text("actualOutput", 2048) : "[Hidden]",
      expectedFolder: disclose ? text("expectedFolder", 1000) : "[Hidden]",
      actualFolder: disclose ? text("actualFolder", 1000) : "[Hidden]",
      stderr: text("stderr", 2048),
      error: text("error", 300),
    };
  });
}
