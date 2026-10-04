// Compares a student's run of one test with the reference solution's run and
// explains every difference. Pure functions (no I/O) so they are easy to test.

import type { CompareOptions } from "./homework-recipe";
import type {
  CheckResult,
  DiffLine,
  FileObservation,
  FileProblem,
  Observation,
  TestFeedback,
} from "./homework-results";

const SHOW_TEXT = 8_000;
const MAX_DIFF_LINES = 200;
const MAX_LINE = 300;
const CONTEXT = 2;
const MAX_FILE_PROBLEMS = 20;

// ---------- text helpers ----------

function splitLines(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  if (normalized === "") return [];
  const lines = normalized.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function trimLines(text: string): string[] {
  const lines = splitLines(text).map((line) => line.replace(/[ \t]+$/, ""));
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function clip(text: string, limit = SHOW_TEXT) {
  return text.length > limit ? `${text.slice(0, limit)}\n… (${text.length - limit} more characters)` : text;
}

function clipLine(text: string) {
  return text.length > MAX_LINE ? `${text.slice(0, MAX_LINE)}…` : text;
}

/**
 * Line diff (longest common subsequence). Unchanged stretches longer than the
 * context are collapsed into a "skip" line.
 */
export function diffLines(expected: string[], actual: string[]): DiffLine[] {
  const n = expected.length;
  const m = actual.length;

  let raw: DiffLine[];

  if (n * m > 1_500_000) {
    // Too large for a full diff: show both sides.
    raw = [
      ...expected.slice(0, 100).map((text) => ({ op: "expected" as const, text })),
      ...actual.slice(0, 100).map((text) => ({ op: "actual" as const, text })),
    ];
  } else {
    const width = m + 1;
    const table = new Uint32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        table[i * width + j] =
          expected[i] === actual[j]
            ? table[(i + 1) * width + j + 1] + 1
            : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
      }
    }

    raw = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (expected[i] === actual[j]) {
        raw.push({ op: "same", text: expected[i] });
        i++;
        j++;
      } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) {
        raw.push({ op: "expected", text: expected[i++] });
      } else {
        raw.push({ op: "actual", text: actual[j++] });
      }
    }
    while (i < n) raw.push({ op: "expected", text: expected[i++] });
    while (j < m) raw.push({ op: "actual", text: actual[j++] });
  }

  // Collapse long unchanged runs, keeping a little context around changes.
  const keep = raw.map((line, index) => {
    if (line.op !== "same") return true;
    for (let k = Math.max(0, index - CONTEXT); k <= Math.min(raw.length - 1, index + CONTEXT); k++) {
      if (raw[k].op !== "same") return true;
    }
    return false;
  });

  const result: DiffLine[] = [];
  let skipped = 0;
  raw.forEach((line, index) => {
    if (keep[index]) {
      if (skipped) {
        result.push({ op: "skip", text: `${skipped} matching line${skipped === 1 ? "" : "s"}` });
        skipped = 0;
      }
      result.push({ op: line.op, text: clipLine(line.text) });
    } else {
      skipped++;
    }
  });
  if (skipped) result.push({ op: "skip", text: `${skipped} matching line${skipped === 1 ? "" : "s"}` });

  if (result.length > MAX_DIFF_LINES) {
    const hidden = result.length - MAX_DIFF_LINES;
    return [...result.slice(0, MAX_DIFF_LINES), { op: "skip", text: `${hidden} more diff lines not shown` }];
  }
  return result;
}

function describeFirstDifference(expected: string[], actual: string[]): string {
  const shared = Math.min(expected.length, actual.length);
  for (let i = 0; i < shared; i++) {
    if (expected[i] !== actual[i]) {
      return `Line ${i + 1} differs: expected "${clipLine(expected[i])}" but got "${clipLine(actual[i])}".`;
    }
  }
  if (actual.length > expected.length) {
    const extra = actual.length - expected.length;
    return `Your output has ${extra} extra line${extra === 1 ? "" : "s"} after line ${expected.length}.`;
  }
  const missing = expected.length - actual.length;
  return actual.length === 0
    ? "Your script printed nothing, but output was expected."
    : `Your output is missing ${missing} line${missing === 1 ? "" : "s"} at the end.`;
}

// ---------- individual checks ----------

function compareStdout(expected: Observation, actual: Observation, mode: CompareOptions["stdout"]): CheckResult {
  const label = "Printed output";
  const truncated = actual.stdoutBytes > actual.stdout.length ? " (only the first 64 KB was kept)" : "";

  let expectedLines: string[];
  let actualLines: string[];
  let equal: boolean;

  switch (mode) {
    case "exact":
      expectedLines = splitLines(expected.stdout);
      actualLines = splitLines(actual.stdout);
      equal = expected.stdout.replace(/\r\n/g, "\n") === actual.stdout.replace(/\r\n/g, "\n");
      break;
    case "whitespace": {
      const squash = (text: string) => text.replace(/\s+/g, " ").trim();
      expectedLines = trimLines(expected.stdout);
      actualLines = trimLines(actual.stdout);
      equal = squash(expected.stdout) === squash(actual.stdout);
      break;
    }
    case "sorted":
      expectedLines = trimLines(expected.stdout).sort();
      actualLines = trimLines(actual.stdout).sort();
      equal = expectedLines.length === actualLines.length && expectedLines.every((line, i) => line === actualLines[i]);
      break;
    default:
      expectedLines = trimLines(expected.stdout);
      actualLines = trimLines(actual.stdout);
      equal = expectedLines.length === actualLines.length && expectedLines.every((line, i) => line === actualLines[i]);
  }

  if (equal) {
    return { kind: "stdout", label, passed: true, summary: "Output matches.", expected: clip(expected.stdout), actual: clip(actual.stdout) };
  }

  let summary = describeFirstDifference(expectedLines, actualLines);
  if (mode === "exact" && trimLines(expected.stdout).join("\n") === trimLines(actual.stdout).join("\n")) {
    summary = "Only whitespace differs (spaces at line ends or the final newline), and this question requires an exact match.";
  }

  const diff = diffLines(expectedLines, actualLines);

  return {
    kind: "stdout",
    label,
    passed: false,
    summary: summary + truncated,
    expected: clip(expected.stdout),
    actual: clip(actual.stdout),
    // A diff with no changed lines (e.g. only a final newline differs) adds nothing.
    diff: diff.some((line) => line.op === "expected" || line.op === "actual") ? diff : undefined,
  };
}

function compareExitCode(expected: Observation, actual: Observation): CheckResult {
  const passed = expected.exitCode === actual.exitCode;
  return {
    kind: "exitCode",
    label: "Exit code",
    passed,
    summary: passed
      ? `Exit code ${actual.exitCode} matches.`
      : `Expected exit code ${expected.exitCode ?? "?"}, but your script exited with ${actual.exitCode ?? "?"}.`,
    expected: String(expected.exitCode ?? ""),
    actual: String(actual.exitCode ?? ""),
  };
}

function permissionText(mode: number) {
  const bits = mode & 0o777;
  const chars = "rwxrwxrwx";
  let text = "";
  for (let i = 0; i < 9; i++) text += bits & (1 << (8 - i)) ? chars[i] : "-";
  return `${text} (${bits.toString(8).padStart(3, "0")})`;
}

function typeName(type: FileObservation["type"]) {
  return type === "dir" ? "folder" : type === "symlink" ? "symbolic link" : type === "file" ? "file" : "special file";
}

function compareFiles(expected: Observation, actual: Observation, checkPermissions: boolean): CheckResult {
  const label = "Files in the work folder";

  if (expected.filesTruncated) {
    return {
      kind: "files",
      label,
      passed: true,
      summary: "The reference solution's folder was too large to compare, so files were not checked.",
    };
  }
  if (actual.filesTruncated) {
    return {
      kind: "files",
      label,
      passed: false,
      summary: "Your script left more than 512 KB of files in the work folder, so they could not be compared.",
    };
  }

  const want = new Map(expected.files.map((file) => [file.path, file]));
  const got = new Map(actual.files.map((file) => [file.path, file]));
  const problems: FileProblem[] = [];

  for (const [path, file] of want) {
    const other = got.get(path);
    if (!other) {
      problems.push({ path, problem: "missing", message: `Missing ${typeName(file.type)}: ${path}` });
      continue;
    }
    if (other.type !== file.type) {
      problems.push({ path, problem: "type", message: `${path} should be a ${typeName(file.type)}, but it is a ${typeName(other.type)}.` });
      continue;
    }
    if (file.type === "file" && file.sha256 !== other.sha256) {
      const diff =
        file.text !== undefined && other.text !== undefined
          ? diffLines(splitLines(file.text), splitLines(other.text))
          : undefined;
      problems.push({
        path,
        problem: "content",
        message:
          diff
            ? `${path} has different contents.`
            : `${path} has different contents (${file.size} bytes expected, ${other.size} bytes found).`,
        diff,
      });
    } else if (file.type === "symlink" && file.target !== other.target) {
      problems.push({ path, problem: "content", message: `${path} should point to "${file.target}", but points to "${other.target}".` });
    }
    if (checkPermissions && (file.mode & 0o777) !== (other.mode & 0o777)) {
      problems.push({
        path,
        problem: "permissions",
        message: `${path} permissions should be ${permissionText(file.mode)}, but they are ${permissionText(other.mode)}.`,
      });
    }
  }

  for (const [path, file] of got) {
    if (!want.has(path)) {
      problems.push({ path, problem: "extra", message: `Unexpected ${typeName(file.type)}: ${path}` });
    }
  }

  if (problems.length === 0) {
    return { kind: "files", label, passed: true, summary: `All ${expected.files.length} files and folders match.` };
  }

  const shown = problems.slice(0, MAX_FILE_PROBLEMS);
  const more = problems.length - shown.length;
  return {
    kind: "files",
    label,
    passed: false,
    summary: `${problems.length} difference${problems.length === 1 ? "" : "s"}: ${shown
      .slice(0, 3)
      .map((p) => p.message.replace(/\.$/, ""))
      .join("; ")}${problems.length > 3 ? "; …" : ""}.`,
    files: more > 0 ? [...shown, { path: "", problem: "extra", message: `${more} more differences not shown.` }] : shown,
  };
}

// ---------- one test ----------

export function compareTest({
  testId,
  index,
  hidden,
  points,
  timeLimitSec,
  compare,
  expected,
  actual,
  input,
}: {
  testId: string;
  index: number;
  hidden: boolean;
  points: number;
  timeLimitSec: number;
  compare: CompareOptions;
  expected: Observation;
  actual: Observation | undefined;
  input: { args: string; stdin: string };
}): TestFeedback {
  const name = hidden ? `Hidden test ${index + 1}` : `Test ${index + 1}`;
  const checks: CheckResult[] = [];

  const ran = Boolean(actual?.ran);
  const exitCode = actual?.exitCode ?? null;
  const durationMs = actual?.durationMs ?? 0;
  const limitMs = timeLimitSec * 1000;
  const timedOut = ran && (exitCode === 124 || exitCode === 137) && durationMs >= limitMs - 100;
  const killed = ran && !timedOut && (exitCode === 137 || exitCode === 153);

  if (!actual || !ran) {
    checks.push({ kind: "run", label: "Run", passed: false, summary: "Your script could not be run for this test." });
  } else if (timedOut) {
    checks.push({
      kind: "run",
      label: "Time limit",
      passed: false,
      summary: `Time limit exceeded: your script was still running after ${timeLimitSec}s and was stopped. Look for loops that never end or commands waiting for input.`,
    });
  } else if (killed) {
    checks.push({
      kind: "run",
      label: "Resource limit",
      passed: false,
      summary: "Your script was stopped for using too much memory, too many processes or too large a file.",
    });
  } else if (actual.setupExit !== null && actual.setupExit !== 0 && expected.setupExit === 0) {
    checks.push({
      kind: "run",
      label: "Test setup",
      passed: false,
      summary: "The test environment could not be prepared for this run. Please submit again.",
    });
  }

  if (actual && ran) {
    if (compare.stdout !== "ignore") checks.push(compareStdout(expected, actual, compare.stdout));
    if (compare.exitCode && !timedOut) checks.push(compareExitCode(expected, actual));
    if (compare.files) checks.push(compareFiles(expected, actual, compare.permissions));
  }

  const passed = checks.length > 0 ? checks.every((check) => check.passed) : true;

  const feedback: TestFeedback = {
    v: 2,
    testId,
    name,
    hidden,
    passed,
    points: passed ? points : 0,
    maxPoints: points,
    durationMs,
    timedOut,
    checks,
  };

  if (!hidden) {
    feedback.stderr = clip(actual?.stderr ?? "", 4_000);
    feedback.input = { args: input.args, stdin: clip(input.stdin, 2_000) };
  }

  return hidden ? hideDetails(feedback) : feedback;
}

/** Remove expected/actual content from a hidden test's feedback. */
export function hideDetails(feedback: TestFeedback): TestFeedback {
  const generic: Record<CheckResult["kind"], string> = {
    run: "",
    stdout: "The printed output did not match.",
    exitCode: "The exit code did not match.",
    files: "The files in the work folder did not match.",
  };

  return {
    v: 2,
    testId: feedback.testId,
    name: feedback.name,
    hidden: true,
    passed: feedback.passed,
    points: feedback.points,
    maxPoints: feedback.maxPoints,
    durationMs: feedback.durationMs,
    timedOut: feedback.timedOut,
    checks: feedback.checks.map((check) => ({
      kind: check.kind,
      label: check.label,
      passed: check.passed,
      summary: check.passed
        ? "Passed."
        : check.kind === "run"
          ? check.summary
          : generic[check.kind],
    })),
  };
}
