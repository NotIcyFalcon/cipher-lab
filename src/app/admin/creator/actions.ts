"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/server/db";
import { requireUserId } from "@/server/current-user";

import {
  creatorSections,
  type ActionState,
  type CreatorSection,
  type EditorBlock,
} from "./types";
import { hashLabAnswer, hashCtfFlag } from "@/server/flags";
import { recipeSchema, normalizeRecipe, totalMemoryMb, DEFAULT_LAB_MEMORY_BUDGET_MB } from "@/lib/lab-recipe";
import { enqueueLabBuild, labNeedsBuild } from "@/server/lab-builds";
import { enqueueHomeworkPrepare } from "@/server/homework-jobs";
import {
  HOMEWORK_LIMITS,
  bonusShares,
  environmentSchema,
  questionSchema,
} from "@/lib/homework-recipe";
import { callGateway } from "@/server/gateway-client";

type Db = ReturnType<typeof getDb>;
type Value = string | number | null;
type Row = { id: string } & Record<string, Value>;

type Table =
  | "topics"
  | "learning_paths"
  | "chapters"
  | "homework"
  | "homework_questions"
  | "homework_test_cases"
  | "ctfs"
  | "ctf_universes"
  | "ctf_challenges"
  | "ctf_hints"
  | "labs";

type ChildTable = "chapters" | "homework_questions" | "homework_test_cases" | "ctf_hints";
type ParentColumn = "path_id" | "homework_id" | "challenge_id";

const tables: Record<CreatorSection, Table> = {
  topics: "topics",
  paths: "learning_paths",
  homework: "homework",
  ctfs: "ctfs",
  universes: "ctf_universes",
  ctf: "ctf_challenges",
  labs: "labs",
};

class InputError extends Error {}

/**
 * Turn SQLite constraint failures into messages the admin can act on instead
 * of the generic "Unable to save" text.
 */
function constraintMessage(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  const code = (error as { code?: unknown }).code;

  switch (code) {
    case "SQLITE_CONSTRAINT_UNIQUE":
    case "SQLITE_CONSTRAINT_PRIMARYKEY":
      return error.message.includes("labs.name")
        ? "Another lab already uses this name. Choose a different lab name."
        : "Another item already uses one of these values.";

    case "SQLITE_CONSTRAINT_FOREIGNKEY":
      return "A linked item no longer exists or is still in use. Refresh the page and try again.";

    case "SQLITE_CONSTRAINT_CHECK":
    case "SQLITE_CONSTRAINT_NOTNULL":
      return "Some values are not in the expected format. Review the form and try again.";

    default:
      return null;
  }
}

async function requireAdmin() {
  const user = await requireUserId();

  if (user !== "admin") {
    throw new Error("Unauthorized");
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InputError("Invalid form data.");
  }

  return value as Record<string, unknown>;
}

function text(
  value: unknown,
  label: string,
  max = 200,
  required = true,
): string {
  if (value === undefined || value === null) {
    if (!required) return "";
    throw new InputError(`${label} is required.`);
  }

  if (typeof value !== "string") {
    throw new InputError(`${label} must be text.`);
  }

  const result = value.trim();

  if (required && !result) {
    throw new InputError(`${label} is required.`);
  }

  if (result.length > max) {
    throw new InputError(`${label} must be at most ${max} characters.`);
  }

  return result;
}

function multiline(
  value: unknown,
  label: string,
  max = 50_000,
  required = false,
): string {
  if (value === undefined || value === null) {
    if (!required) return "";
    throw new InputError(`${label} is required.`);
  }

  if (typeof value !== "string") {
    throw new InputError(`${label} must be text.`);
  }

  if (required && !value.trim()) {
    throw new InputError(`${label} is required.`);
  }

  if (value.length > max) {
    throw new InputError(`${label} must be at most ${max} characters.`);
  }

  // Preserve indentation and trailing newlines in scripts.
  return value;
}

function integer(
  value: unknown,
  label: string,
  min = 0,
  max = 1_000_000,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new InputError(
      `${label} must be a whole number between ${min} and ${max}.`,
    );
  }

  return value;
}

function list(value: unknown, label: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) {
    throw new InputError(`${label} must contain at most ${max} items.`);
  }

  return value;
}

function choice<T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new InputError(`Invalid ${label}.`);
  }

  return value as T;
}

function identifier(value: unknown, label = "ID"): string {
  return text(value, label, 128);
}

function uniqueIds(rows: { id: string }[], label: string) {
  if (new Set(rows.map((row) => row.id)).size !== rows.length) {
    throw new InputError(`${label} contain duplicate IDs.`);
  }
}

function requireExisting(db: Db, table: Table, id: string, label: string) {
  const row = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id);

  if (!row) {
    throw new InputError(`${label} no longer exists. Refresh and try again.`);
  }
}

function parentId(
  db: Db,
  table: Table,
  value: unknown,
  label: string,
): string {
  const id = identifier(value, label);
  requireExisting(db, table, id, label);
  return id;
}

function optionalLab(db: Db, value: unknown): string | null {
  const id = text(value, "Lab assignment", 128, false);

  if (id) {
    requireExisting(db, "labs", id, "Selected lab");
  }

  return id || null;
}

function requireTopic(
  db: Db,
  value: unknown,
  allowed: readonly string[],
): string {
  const id = identifier(value, "Topic");

  const topic = db
    .prepare("SELECT type FROM topics WHERE id = ?")
    .get(id) as { type: string } | undefined;

  if (!topic || !allowed.includes(topic.type)) {
    throw new InputError("Select a topic of the correct type.");
  }

  return id;
}

/**
 * SQL identifiers come exclusively from internal table names and row keys.
 * All user values are passed as SQL parameters.
 */
function writeRow(db: Db, table: Table, row: Row) {
  const columns = Object.keys(row);
  const updateColumns = columns.filter((column) => column !== "id");

  db.prepare(`
    INSERT INTO ${table} (${columns.join(", ")})
    VALUES (${columns.map(() => "?").join(", ")})
    ON CONFLICT(id) DO UPDATE SET
      ${updateColumns.map((column) => `${column} = excluded.${column}`).join(", ")}
  `).run(...columns.map((column) => row[column]));
}

/**
 * Keep existing child IDs stable and reject attempts to move children
 * belonging to a different parent.
 */
function syncChildren(
  db: Db,
  table: ChildTable,
  parentColumn: ParentColumn,
  ownerId: string,
  rows: Row[],
) {
  uniqueIds(rows, "Child records");

  for (const row of rows) {
    const existing = db
      .prepare(`SELECT ${parentColumn} AS owner FROM ${table} WHERE id = ?`)
      .get(row.id) as { owner: string } | undefined;

    if (existing && existing.owner !== ownerId) {
      throw new InputError("A child record belongs to another item.");
    }
  }

  const current = db
    .prepare(`SELECT id FROM ${table} WHERE ${parentColumn} = ?`)
    .all(ownerId) as { id: string }[];

  const retained = new Set(rows.map((row) => row.id));

  for (const row of current) {
    if (!retained.has(row.id)) {
      db.prepare(
        `DELETE FROM ${table} WHERE id = ? AND ${parentColumn} = ?`,
      ).run(row.id, ownerId);
    }
  }

  for (const row of rows) {
    writeRow(db, table, {
      ...row,
      [parentColumn]: ownerId,
    });
  }
}

function storedChapterLabHashes(db: Db, chapterId: string) {
  const row = db.prepare(`SELECT content_json FROM chapters WHERE id = ?`).get(chapterId) as { content_json: string } | undefined;
  const map = new Map<string, string>();
  if (row?.content_json) {
    const blocks = JSON.parse(row.content_json);
    for (const b of blocks) {
      if (b.type === 'lab' && b.completionCodeHash) map.set(b.id, b.completionCodeHash);
    }
  }
  return map;
}

function parseBlocks(db: Db, chapterId: string, value: unknown): EditorBlock[] {
  const storedHashes = storedChapterLabHashes(db, chapterId);
  const blocks = list(value, "Chapter blocks", 100).map((item): EditorBlock => {
    const block = object(item);
    const id = identifier(block.id, "Block ID");

    const type = choice(
      block.type,
      ["note", "tip", "code", "quiz", "lab"] as const,
      "block type",
    );

    switch (type) {
      case "note":
      case "tip":
        return {
          id,
          type,
          title: text(block.title, "Block title"),
          body: multiline(block.body, "Block content", 50_000, true),
        };

      case "code":
        return {
          id,
          type,
          title: text(block.title, "Script header"),
          code: multiline(block.code, "Bash script", 50_000, true),
          caption: multiline(block.caption, "Script footer", 10_000),
        };

      case "quiz": {
        const options = list(block.options, "Quick Check options", 10).map(
          (option) => text(option, "Quick Check option", 1_000),
        );

        if (options.length < 2) {
          throw new InputError("Quick Checks require at least two options.");
        }

        return {
          id,
          type,
          question: text(block.question, "Quick Check question", 2_000),
          options,
          answer: integer(
            block.answer,
            "Correct answer",
            0,
            options.length - 1,
          ),
          explanation: multiline(
            block.explanation,
            "Quick Check explanation",
            10_000,
          ),
        };
      }

      case "lab": {
        let completionCodeHash: string | undefined = undefined;

        const rawAnswer = text(block.completionAnswer, "Completion Answer", 200, false);
        if (rawAnswer) {
          completionCodeHash = hashLabAnswer(rawAnswer);
        } else {
          completionCodeHash = storedHashes.get(id);
        }

        return {
          id,
          type,
          labId: parentId(db, "labs", block.labId, "Block lab"),
          title: text(block.title, "Lab block title"),
          objective: multiline(block.objective, "Lab objective", 10_000, true),
          hint: multiline(block.hint, "Lab hint", 10_000),
          points: integer(block.points, "Lab points"),
          completionCodeHash,
        };
      }
    }
  });

  uniqueIds(blocks, "Chapter blocks");
  return blocks;
}

function saveTopic(db: Db, id: string, input: Record<string, unknown>) {
  const type = choice(
    input.type,
    ["path", "homework", "ctf"] as const,
    "topic type",
  );

  const old = db
    .prepare("SELECT type FROM topics WHERE id = ?")
    .get(id) as { type: string } | undefined;

  if (old && old.type !== type) {
    // CTF challenges belong to topics through ctfs (006 removed
    // ctf_challenges.topic_id).
    const references = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM learning_paths WHERE topic_id = ?) +
        (SELECT COUNT(*) FROM ctfs WHERE topic_id = ?) AS count
    `).get(id, id) as { count: number };

    if (references.count > 0) {
      throw new InputError(
        "A topic containing learning paths or CTFs cannot change type.",
      );
    }
  }

  writeRow(db, "topics", {
    id,
    name: text(input.name, "Topic name"),
    description: multiline(input.description, "Topic description", 10_000),
    type,
  });
}

function savePath(db: Db, id: string, input: Record<string, unknown>) {
  const chapters = list(input.chapters, "Chapters", 50).map(
    (value, index): Row => {
      const chapter = object(value);

      return {
        id: identifier(chapter.id, "Chapter ID"),
        path_id: id,
        title: text(chapter.title, "Chapter title"),
        description: multiline(
          chapter.description,
          "Chapter description",
          10_000,
        ),
        reading_points: integer(chapter.reading_points, "Reading points"),
        sequence_order: index,
        content_json: JSON.stringify(parseBlocks(db, identifier(chapter.id, "Chapter ID"), chapter.blocks)),
        objectives: JSON.stringify(list(chapter.objectives, "Chapter goals", 10).map((goal) => text(goal, "Chapter goal", 2000))),
        objectives_json: JSON.stringify(list(chapter.objectives, "Chapter goals", 10).map((goal) => text(goal, "Chapter goal", 2000))),
      };
    },
  );

  writeRow(db, "learning_paths", {
    id,
    topic_id: requireTopic(db, input.topic_id, ["path", "homework"]),
    title: text(input.title, "Path title"),
    difficulty: text(input.difficulty, "Difficulty", 80, false),
    time_days: integer(input.time_days, "Expected days", 0, 3_650),
  });

  syncChildren(db, "chapters", "path_id", id, chapters);
}

function zodMessage(error: { issues: { message: string; path: (string | number)[] }[] }, prefix: string) {
  const issue = error.issues[0];
  return issue ? `${prefix}${issue.message}` : `${prefix}invalid value.`;
}

/**
 * Homework: environment + questions + test cases. Returns true so the caller
 * queues preparation; enqueueHomeworkPrepare skips it when nothing that
 * affects the expected results changed.
 */
function saveHomework(db: Db, id: string, input: Record<string, unknown>): boolean {
  const environment = environmentSchema.safeParse(normalizeEnvironmentInput(input.environment));
  if (!environment.success) {
    throw new InputError(zodMessage(environment.error, "Environment: "));
  }

  const questions = list(input.questions, "Questions", HOMEWORK_LIMITS.questions);
  if (questions.length === 0) {
    throw new InputError("Add at least one homework question.");
  }

  const questionRows: Row[] = [];
  const testRows: Row[] = [];

  questions.forEach((raw, index) => {
    const value = object(raw);
    const parsed = questionSchema.safeParse({
      ...value,
      tests: Array.isArray(value.tests) ? value.tests : [],
    });
    if (!parsed.success) {
      throw new InputError(zodMessage(parsed.error, `Question ${index + 1}: `));
    }
    const question = parsed.data;

    questionRows.push({
      id: question.id,
      homework_id: id,
      title: question.title,
      question_markdown: question.question_markdown,
      standard_solution_script: question.standard_solution_script.replace(/\r\n/g, "\n"),
      setup_script: "",
      time_limit_sec: question.time_limit_sec,
      compare_json: JSON.stringify(question.compare),
      sequence_order: index,
    });

    question.tests.forEach((test, testIndex) => {
      // expected_json is written by preparation and left untouched here.
      testRows.push({
        id: test.id,
        homework_id: id,
        question_id: question.id,
        setup_script: test.setup_script.replace(/\r\n/g, "\n"),
        args: test.args.trim(),
        stdin: test.stdin.replace(/\r\n/g, "\n"),
        xp_reward: test.xp_reward,
        is_hidden: test.is_hidden ? 1 : 0,
        sequence_order: testIndex,
      });
    });
  });

  uniqueIds(questionRows, "Questions");
  uniqueIds(testRows, "Test cases");

  const bonus = integer(input.total_base_xp, "Bonus XP");
  const shares = bonusShares(bonus, questionRows.length);
  questionRows.forEach((question, index) => {
    const testXp = testRows
      .filter((test) => test.question_id === question.id)
      .reduce((sum, test) => sum + Number(test.xp_reward), 0);
    if (testXp + (shares[index] ?? 0) < 1) {
      throw new InputError(`Question ${index + 1} must be worth at least 1 XP (give its tests some XP).`);
    }
  });

  writeRow(db, "homework", {
    id,
    path_id: parentId(db, "learning_paths", input.path_id, "Learning path"),
    title: text(input.title, "Title", 200),
    environment_json: JSON.stringify(environment.data),
    // Legacy columns. Questions and their scripts live in homework_questions.
    question_markdown: "",
    setup_script: "",
    total_base_xp: bonus,
  });

  syncChildren(db, "homework_questions", "homework_id", id, questionRows);
  syncChildren(db, "homework_test_cases", "homework_id", id, testRows);

  return true;
}

/** Accept an environment object from the editor, dropping blank list lines. */
function normalizeEnvironmentInput(value: unknown) {
  if (!value || typeof value !== "object") return value;
  const env = value as Record<string, unknown>;
  return {
    ...env,
    packages: Array.isArray(env.packages)
      ? [...new Set((env.packages as unknown[]).map((p) => String(p).trim()).filter(Boolean))]
      : [],
    buildScript: typeof env.buildScript === "string" ? env.buildScript.replace(/\r\n/g, "\n") : env.buildScript,
  };
}

function saveCtfDefinition(db: Db, id: string, input: Record<string, unknown>) {
  writeRow(db, "ctfs", {
    id,
    topic_id: requireTopic(db, input.topic_id, ["ctf"]),
    name: text(input.name, "CTF definition name"),
    description: multiline(input.description, "CTF description", 10_000),
    difficulty: text(input.difficulty, "Difficulty", 80, false),
    suggested_paths_json: JSON.stringify(
      [...new Set(
        list(
          input.suggested_path_ids,
          "Suggested paths",
          10,
        ).map((value) =>
          parentId(
            db,
            "learning_paths",
            value,
            "Recommended learning path",
          ),
        ),
      )],
    ),
  });
}

function saveCtfUniverse(db: Db, id: string, input: Record<string, unknown>) {
  writeRow(db, "ctf_universes", {
    id,
    ctf_id: parentId(db, "ctfs", input.ctf_id, "CTF definition"),
    name: text(input.name, "Universe name"),
    description: multiline(input.description, "Universe description", 10_000),
  });
}

function getFlagHash(
  input: Record<string, unknown>,
  existingHash: string | null,
): string | null {
  const raw = text(input.flag, "Flag", 1024, false);

  if (!raw) {
    return existingHash;
  }

  return hashCtfFlag(raw);
}

function saveCtf(db: Db, id: string, input: Record<string, unknown>) {
  const existing = db.prepare(`SELECT flag_hash FROM ctf_challenges WHERE id = ?`).get(id) as { flag_hash: string | null } | undefined;

  const hints = list(input.hints, "Hints", 50).map((value, index): Row => {
    const hint = object(value);

    return {
      id: identifier(hint.id, "Hint ID"),
      challenge_id: id,
      text: multiline(hint.text, "Hint text", 10_000, true),
      penalty: integer(hint.penalty, "Hint XP penalty"),
      sequence_order: index,
    };
  });

  writeRow(db, "ctf_challenges", {
    id,
    universe_id: parentId(db, "ctf_universes", input.universe_id, "CTF universe"),
    title: text(input.title, "Challenge title"),
    description: multiline(input.description, "Challenge description"),
    points: integer(input.points, "Base points"),
    difficulty: text(input.difficulty, "Difficulty", 80, false),
    lab_id: optionalLab(db, input.lab_id),
    flag_hash: getFlagHash(input, existing?.flag_hash ?? null),
  });

  syncChildren(db, "ctf_hints", "challenge_id", id, hints);
}

function saveLab(
  db: Db,
  id: string,
  input: Record<string, unknown>,
) {
  const parsed = recipeSchema.safeParse(normalizeRecipe(input.recipe));

  if (!parsed.success) {
    throw new InputError(parsed.error.issues[0]?.message ?? "The lab recipe is invalid.");
  }

  const recipe = parsed.data;
  const entry = recipe.machines.find((m) => m.key === recipe.entryMachine);

  if (totalMemoryMb(recipe) > DEFAULT_LAB_MEMORY_BUDGET_MB) {
    throw new InputError(
      `The machines request ${totalMemoryMb(recipe)} MB total, above the ${DEFAULT_LAB_MEMORY_BUDGET_MB} MB a session may use. Reduce machine memory.`,
    );
  }

  const existing = db.prepare(`
    SELECT built_recipe_hash FROM labs WHERE id = ?
  `).get(id) as { built_recipe_hash: string | null } | undefined;

  writeRow(db, "labs", {
    id,
    name: text(input.name, "Lab name", 200),
    description: multiline(input.description, "Lab description", 2_000),
    recipe_json: JSON.stringify(recipe),

    // Legacy NOT NULL columns kept satisfied; the runtime no longer reads them.
    base_image: "(recipe)",
    default_user: entry?.mainUser ?? "root",
    whitelist_enabled: recipe.policy.mode === "whitelist" ? 1 : 0,
  });

  // A new or changed recipe is built right after the save commits.
  return labNeedsBuild(existing?.built_recipe_hash ?? null, recipe);
}

export async function saveCreatorAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  let destination: string;

  try {
    const raw = formData.get("payload");

    // Keep this below Next.js's default 1 MB Server Action request limit.
    if (
      typeof raw !== "string" ||
      Buffer.byteLength(raw, "utf8") > 700_000
    ) {
      throw new InputError(
        "The form is too large. Keep each save below 700 KB.",
      );
    }

    let decoded: unknown;

    try {
      decoded = JSON.parse(raw);
    } catch {
      throw new InputError("The form contains invalid JSON.");
    }

    const input = object(decoded);
    const entity = choice(input.entity, creatorSections, "editor");
    const suppliedId = text(input.id, "Record ID", 128, false);
    const id = suppliedId || randomUUID();

    const db = getDb();

    // Work queued only once the save has committed (lab builds, homework prep).
    let afterCommit: (() => void) | null = null;

    db.transaction(() => {
      if (suppliedId) {
        requireExisting(db, tables[entity], suppliedId, "This record");
      }

      switch (entity) {
        case "topics":
          saveTopic(db, id, input);
          break;
        case "paths":
          savePath(db, id, input);
          break;
        case "homework":
          if (saveHomework(db, id, input)) afterCommit = () => enqueueHomeworkPrepare(id);
          break;
        case "ctfs":
          saveCtfDefinition(db, id, input);
          break;
        case "universes":
          saveCtfUniverse(db, id, input);
          break;
        case "ctf":
          saveCtf(db, id, input);
          break;
        case "labs":
          if (saveLab(db, id, input)) afterCommit = () => enqueueLabBuild(id);
          break;
      }
    })();

    // TypeScript cannot see the assignment inside the callback above.
    (afterCommit as (() => void) | null)?.();

    destination =
      `/admin/creator/${entity}?edit=${encodeURIComponent(id)}&saved=1`;
  } catch (error) {
    if (error instanceof InputError) {
      return { error: error.message };
    }

    console.error("Creator save failed", error);

    const constraint = constraintMessage(error);
    if (constraint) return { error: constraint };

    return {
      error: "Unable to save this item. Please refresh and try again.",
    };
  }

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function deleteCreatorAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  let entity: CreatorSection;

  try {
    entity = choice(formData.get("entity"), creatorSections, "record type");
    const id = identifier(formData.get("id"));
    const db = getDb();

    db.transaction(() => {
      requireExisting(db, tables[entity], id, "This record");

      if (entity === "labs") {
        // Homework and CTF FKs use ON DELETE SET NULL, but chapter lab
        // references live inside JSON. Reject deletion while in use.
        const relational = db.prepare(`
          SELECT
            (SELECT COUNT(*) FROM ctf_challenges WHERE lab_id = ?) AS count
        `).get(id) as { count: number };

        if (relational.count > 0) {
          throw new InputError(
            "Unassign this lab from its CTF challenges first.",
          );
        }

        const chapters = db
          .prepare(`
            SELECT c.content_json, c.title, p.title as pathTitle
            FROM chapters c
            JOIN learning_paths p ON c.path_id = p.id
          `)
          .all() as { content_json: string; title: string; pathTitle: string }[];

        for (const chapter of chapters) {
          let blocks: unknown;

          try {
            blocks = JSON.parse(chapter.content_json);
          } catch {
            throw new InputError(
              `The chapter "${chapter.title}" contains invalid JSON. Repair it before deleting labs.`,
            );
          }

          if (!Array.isArray(blocks)) {
            throw new InputError(
              `The chapter "${chapter.title}" uses an unsupported content format. Review it before deleting labs.`,
            );
          }

          const used = blocks.some((block: unknown) => {
            if (!block || typeof block !== "object") return false;

            const value = block as Record<string, unknown>;
            return value.type === "lab" && value.labId === id;
          });

          if (used) {
            throw new InputError(
              `Remove this lab from the chapter "${chapter.title}" in learning path "${chapter.pathTitle}" before deleting it.`,
            );
          }
        }
      }

      db.prepare(`DELETE FROM ${tables[entity]} WHERE id = ?`).run(id);
    })();

    // Free the Docker images that belonged to the deleted item (best effort).
    if (entity === "labs") void callGateway("/labs/delete", { labId: id });
    if (entity === "homework") void callGateway("/homework/delete", { homeworkId: id });
  } catch (error) {
    if (error instanceof InputError) {
      return { error: error.message };
    }

    console.error("Creator delete failed", error);

    const constraint = constraintMessage(error);
    if (constraint) return { error: constraint };

    return {
      error: "Unable to delete this item. Please refresh and try again.",
    };
  }

  revalidatePath("/", "layout");
  redirect(`/admin/creator/${entity}?deleted=1`);
}

// Queues a Docker build of a lab's current recipe. The gateway does the build;
// the web app only enqueues it and shows progress.
export async function buildLabAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  try {
    const id = identifier(formData.get("id"), "Lab");
    const db = getDb();

    const lab = db.prepare(`SELECT id FROM labs WHERE id = ?`).get(id);

    if (!lab) {
      return { error: "This lab no longer exists. Refresh and try again." };
    }

    enqueueLabBuild(id);
  } catch (error) {
    if (error instanceof InputError) {
      return { error: error.message };
    }
    console.error("Lab build enqueue failed", error);
    return { error: "Could not start the build. Please try again." };
  }

  revalidatePath("/admin/creator/labs", "page");
  redirect(`/admin/creator/labs?edit=${encodeURIComponent(formData.get("id") as string)}&building=1`);
}

// Re-runs preparation (environment build + reference solution on every test),
// for example after fixing a failure or to refresh expected results.
export async function prepareHomeworkAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  let id: string;
  try {
    id = identifier(formData.get("id"), "Homework");
    const exists = getDb().prepare(`SELECT id FROM homework WHERE id = ?`).get(id);
    if (!exists) return { error: "This homework no longer exists. Refresh and try again." };
    enqueueHomeworkPrepare(id, { force: true });
  } catch (error) {
    if (error instanceof InputError) return { error: error.message };
    console.error("Homework prepare enqueue failed", error);
    return { error: "Could not start preparation. Please try again." };
  }

  revalidatePath("/admin/creator/homework", "page");
  redirect(`/admin/creator/homework?edit=${encodeURIComponent(id)}`);
}
