import "server-only";

import { hideDetails } from "@/lib/homework-compare";
import type { TestFeedback } from "@/lib/homework-results";
import type { LegacyTestResult, TestResult } from "@/lib/progress-types";

function isFeedback(value: unknown): value is TestFeedback {
  return Boolean(value) && typeof value === "object" && (value as { v?: unknown }).v === 2;
}

/**
 * Results as sent to the browser. New results were already redacted when they
 * were graded; this re-applies the hidden-test rule defensively and reduces
 * legacy rows to fields that are safe to show.
 */
export function sanitizeSubmissionResults(input: unknown): TestResult[] {
  if (!Array.isArray(input)) return [];

  return input.slice(0, 100).map((value, index): TestResult => {
    if (isFeedback(value)) {
      return value.hidden ? hideDetails(value) : value;
    }

    const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const hidden = row.hidden !== false;
    const text = (key: string) => (!hidden && typeof row[key] === "string" ? (row[key] as string).slice(0, 2_000) : "");

    const legacy: LegacyTestResult = {
      name: hidden ? `Hidden test ${index + 1}` : `Test ${index + 1}`,
      passed: row.passed === true,
      expectedOutput: text("expectedOutput"),
      actualOutput: text("actualOutput"),
    };
    return legacy;
  });
}
