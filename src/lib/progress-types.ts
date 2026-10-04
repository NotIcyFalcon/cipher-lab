import type { TestFeedback } from "@/lib/homework-results";

/** Legacy result rows from the old grader (shown read-only in history). */
export type LegacyTestResult = {
  name: string;
  passed: boolean;
  expectedOutput?: string;
  actualOutput?: string;
  [key: string]: unknown;
};

export type TestResult = TestFeedback | LegacyTestResult;

export type HomeworkExample = {
  name: string;
  setup: string;
  args: string;
  stdin: string;
  expectedStdout: string | null;
};

export type HomeworkQuestion = {
  homeworkId: string;
  homeworkTitle: string;
  questionId: string;
  title: string;
  objective: string;
  /** This question's share of the homework's bonus XP (awarded when all tests pass). */
  baseXp: number;
  testXp: number;
  totalPoints: number;
  totalTests: number;
  hiddenTests: number;
  timeLimitSec: number;
  /** Expected results are prepared and submissions are accepted. */
  ready: boolean;
  /** Not ready yet, but preparation is queued or running. */
  preparing: boolean;
  examples: HomeworkExample[];
};

export type SubmissionSummary = {
  id: number;
  createdAt: number;
  status: "pending" | "graded" | "error";
  awardedXp: number;
  totalPoints: number;
  passedTests: number;
  totalTests: number;
};

export type Submission = SubmissionSummary & {
  homeworkId: string;
  questionId: string | null;
  filename: string;
  code: string;
  results: TestResult[];
  error: string | null;
};

export type HistoryPage = {
  items: SubmissionSummary[];
  nextCursor: number | null;
};

export type Progress = {
  readingXp: number;
  labsXp: number;
  homeworkXp: number;
  ctfXp: number;
  totalXp: number;
  readingIds: string[];
  labIds: string[];
  /** Best score per homework (sum of its questions' best scores). */
  homeworkBest: Record<string, number>;
  /** Best score per homework question. */
  homeworkQuestionBest: Record<string, number>;
  ctfIds: string[];
};
