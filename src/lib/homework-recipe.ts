import { z } from "zod";
import { LAB_TEMPLATE_IDS, type LabFile, type LabTemplate } from "@/lib/lab-recipe";

/**
 * Homework v2.
 * - Environment: built once into a Docker image (base image, packages, files,
 *   build script). The grader runs as the unprivileged "student" user.
 * - Each test case: a setup script (root, run inside a fresh empty work
 *   folder), optional command-line arguments and standard input.
 * - Preparing a homework runs the reference solution once per test and stores
 *   what it printed, its exit code and the files it left in the work folder.
 * - Grading runs the student's script the same way and compares, using the
 *   question's comparison options.
 */

export type StdoutMode = "trim" | "exact" | "whitespace" | "sorted" | "ignore";

export type CompareOptions = {
  stdout: StdoutMode;
  exitCode: boolean;
  files: boolean;
  permissions: boolean;
};

export type HomeworkEnvironment = {
  template: LabTemplate;
  packages: string[];
  files: LabFile[];
  buildScript: string;
};

export const STDOUT_MODES: { id: StdoutMode; label: string; hint: string }[] = [
  { id: "trim", label: "Ignore trailing spaces and blank lines (recommended)", hint: "Line endings and spaces at the end of lines don't matter." },
  { id: "exact", label: "Exact match", hint: "Every byte must match, including trailing spaces and newlines." },
  { id: "whitespace", label: "Ignore all whitespace differences", hint: "Runs of spaces, tabs and newlines count as one space." },
  { id: "sorted", label: "Same lines in any order", hint: "Lines are compared after sorting them." },
  { id: "ignore", label: "Don't check output", hint: "Only the other checks decide the result." },
];

export const HOMEWORK_LIMITS = {
  questions: 10,
  testsPerQuestion: 50,
  timeMinSec: 1,
  timeMaxSec: 30,
  timeDefaultSec: 5,
  solutionBytes: 64 * 1024,
  setupChars: 50_000,
  stdinBytes: 64 * 1024,
  argsChars: 1_000,
  envFiles: 30,
  envFileBytes: 100_000,
  packages: 60,
} as const;

export const DEFAULT_COMPARE: CompareOptions = {
  stdout: "trim",
  exitCode: true,
  files: true,
  permissions: false,
};

export function defaultEnvironment(): HomeworkEnvironment {
  return { template: "debian", packages: [], files: [], buildScript: "" };
}

// ---------- validation ----------

const packageName = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9+._:-]*(=[A-Za-z0-9+._:~-]+)?$/, "Invalid package name.")
  .max(120);

const envFileSchema = z.object({
  path: z
    .string()
    .trim()
    .max(255)
    .refine(
      (value) =>
        (value.startsWith("/") || value.startsWith("~/")) &&
        !value.split("/").includes("..") &&
        !/[\n\r\0]/.test(value) &&
        value.length > 2,
      "Environment file paths must be absolute (or start with ~/) and must not contain '..'.",
    ),
  owner: z.enum(["root", "student"], { message: "Environment files belong to root or student." }),
  mode: z.string().trim().regex(/^[0-7]{3,4}$/, "Mode must be octal, e.g. 644."),
  content: z.string().max(HOMEWORK_LIMITS.envFileBytes),
});

export const environmentSchema = z.object({
  template: z.enum(LAB_TEMPLATE_IDS as [LabTemplate, ...LabTemplate[]]),
  packages: z.array(packageName).max(HOMEWORK_LIMITS.packages),
  files: z.array(envFileSchema).max(HOMEWORK_LIMITS.envFiles),
  buildScript: z.string().max(50_000),
});

export const compareSchema = z.object({
  stdout: z.enum(["trim", "exact", "whitespace", "sorted", "ignore"]),
  exitCode: z.boolean(),
  files: z.boolean(),
  permissions: z.boolean(),
});

const bytes = (value: string) => new TextEncoder().encode(value).length;

export const testSchema = z.object({
  id: z.string().trim().min(1).max(128),
  setup_script: z.string().max(HOMEWORK_LIMITS.setupChars).refine((v) => !v.includes("\0"), "Setup scripts cannot contain NUL characters."),
  args: z
    .string()
    .max(HOMEWORK_LIMITS.argsChars)
    .refine((v) => !/[\n\r\0]/.test(v), "Arguments must be a single line."),
  stdin: z
    .string()
    .refine((v) => bytes(v) <= HOMEWORK_LIMITS.stdinBytes && !v.includes("\0"), "Standard input is limited to 64 KB of text."),
  xp_reward: z.number().int().min(0).max(1_000_000),
  is_hidden: z.boolean(),
});

export const questionSchema = z.object({
  id: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1, "Every question needs a title.").max(200),
  question_markdown: z.string().trim().min(1, "Every question needs instructions.").max(50_000),
  standard_solution_script: z
    .string()
    .refine((v) => v.trim().length > 0, "Every question needs a reference solution.")
    .refine((v) => bytes(v) <= HOMEWORK_LIMITS.solutionBytes && !v.includes("\0"), "Reference solutions are limited to 64 KB."),
  time_limit_sec: z.number().int().min(HOMEWORK_LIMITS.timeMinSec).max(HOMEWORK_LIMITS.timeMaxSec),
  compare: compareSchema,
  tests: z.array(testSchema).min(1, "Every question needs at least one test case.").max(HOMEWORK_LIMITS.testsPerQuestion),
});

export type TestDefinition = z.infer<typeof testSchema>;
export type QuestionDefinition = z.infer<typeof questionSchema>;

/** Parse stored environment JSON; empty/legacy values become the default. */
export function parseEnvironment(json: string | null | undefined): HomeworkEnvironment {
  try {
    const value = JSON.parse(json || "{}");
    if (!value || typeof value !== "object" || !("template" in value)) return defaultEnvironment();
    return environmentSchema.parse(value);
  } catch {
    return defaultEnvironment();
  }
}

export function parseCompare(json: string | null | undefined): CompareOptions {
  try {
    return compareSchema.parse({ ...DEFAULT_COMPARE, ...JSON.parse(json || "{}") });
  } catch {
    return { ...DEFAULT_COMPARE };
  }
}

/**
 * The homework's bonus XP is split across its questions in order; a question's
 * share is awarded when every one of its tests passes.
 */
export function bonusShares(totalBonus: number, questionCount: number): number[] {
  if (questionCount <= 0) return [];
  const base = Math.floor(totalBonus / questionCount);
  const extra = totalBonus % questionCount;
  return Array.from({ length: questionCount }, (_, index) => base + (index < extra ? 1 : 0));
}
