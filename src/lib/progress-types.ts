export type TestResult = {
  name: string;
  passed: boolean;
  expectedOutput: string;
  actualOutput: string;
  [key: string]: unknown;
};

export type HomeworkQuestion = {
  homeworkId: string;
  questionId: string;
  title: string;
  objective: string;
  baseXp: number;
  testXp: number;
  totalPoints: number;
  totalTests: number;
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
  homeworkBest: Record<string, number>;
  ctfIds: string[];
};
