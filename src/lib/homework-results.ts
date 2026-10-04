// Shapes shared by the grader (server) and the homework page (client).

/** What the runner saw for one test (reference or student run). */
export type FileObservation = {
  path: string;
  type: "file" | "dir" | "symlink" | "other";
  mode: number;
  size: number;
  sha256?: string;
  text?: string;
  target?: string;
};

export type Observation = {
  ran: boolean;
  setupExit: number | null;
  setupLog: string;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stdoutBytes: number;
  stderr: string;
  stderrBytes: number;
  files: FileObservation[];
  filesTruncated: boolean;
};

/** One line of a diff between expected and actual text. */
export type DiffLine = {
  op: "same" | "expected" | "actual" | "skip";
  text: string;
};

export type FileProblem = {
  path: string;
  problem: "missing" | "extra" | "type" | "content" | "permissions";
  message: string;
  diff?: DiffLine[];
};

export type CheckResult = {
  kind: "run" | "stdout" | "exitCode" | "files";
  label: string;
  passed: boolean;
  summary: string;
  expected?: string;
  actual?: string;
  diff?: DiffLine[];
  files?: FileProblem[];
};

export type TestFeedback = {
  v: 2;
  testId: string;
  name: string;
  hidden: boolean;
  passed: boolean;
  points: number;
  maxPoints: number;
  durationMs: number;
  timedOut: boolean;
  checks: CheckResult[];
  stderr?: string;
  input?: { args: string; stdin: string };
};
