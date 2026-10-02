"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/server/db";
import { requireUserId } from "@/server/current-user";
import { runGrader } from "@/server/run-grader";
import {
  creatorSections,
  type ActionState,
  type CreatorSection,
  type EditorBlock,
} from "./types";

type Db = ReturnType<typeof getDb>;
type Value = string | number | null;
type Row = { id: string } & Record<string, Value>;

type Table =
  | "topics"
  | "learning_paths"
  | "chapters"
  | "homework"
  | "homework_test_cases"
  | "ctfs"
  | "ctf_universes"
  | "ctf_challenges"
  | "ctf_hints"
  | "labs";

type ChildTable = "chapters" | "homework_test_cases" | "ctf_hints";
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

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new InputError(`${label} must be true or false.`);
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

function parseBlocks(db: Db, value: unknown): EditorBlock[] {
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

      case "lab":
        return {
          id,
          type,
          labId: parentId(db, "labs", block.labId, "Block lab"),
          title: text(block.title, "Lab block title"),
          objective: multiline(block.objective, "Lab objective", 10_000, true),
          hint: multiline(block.hint, "Lab hint", 10_000),
          points: integer(block.points, "Lab points"),
        };
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
    const references = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM learning_paths WHERE topic_id = ?) +
        (SELECT COUNT(*) FROM ctf_challenges WHERE topic_id = ?) AS count
    `).get(id, id) as { count: number };

    if (references.count > 0) {
      throw new InputError(
        "A topic containing paths or challenges cannot change type.",
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
        content_json: JSON.stringify(parseBlocks(db, chapter.blocks)),
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

function saveHomework(db: Db, id: string, input: Record<string, unknown>) {
  const tests = list(input.tests, "Test cases", 100).map((value): Row => {
    const test = object(value);

    return {
      id: identifier(test.id, "Test case ID"),
      homework_id: id,
      setup_script: multiline(test.setup_script, "Test case setup script"),
      xp_reward: integer(test.xp_reward, "Test case XP"),
      is_hidden: boolean(test.is_hidden, "Hidden test case") ? 1 : 0,
      expected_output: typeof test.expected_output === "string" ? test.expected_output : null,
      expected_folder: typeof test.expected_folder === "string" ? test.expected_folder : null,
    };
  });

  writeRow(db, "homework", {
    id,
    path_id: parentId(db, "learning_paths", input.path_id, "Learning path"),
    question_markdown: multiline(
      input.question_markdown,
      "Question Markdown",
      50_000,
      true,
    ),
    setup_script: multiline(input.setup_script, "Global setup script", 50_000),
    total_base_xp: integer(input.total_base_xp, "Total Base XP"),
    lab_id: optionalLab(db, input.lab_id),
    expected_result_description: multiline(
      input.expected_result_description,
      "Expected result",
    ),
    standard_solution_script: multiline(
      input.standard_solution_script,
      "Standard solution script",
    ),
  });

  syncChildren(db, "homework_test_cases", "homework_id", id, tests);
}

function saveCtfDefinition(db: Db, id: string, input: Record<string, unknown>) {
  writeRow(db, "ctfs", {
    id,
    topic_id: requireTopic(db, input.topic_id, ["ctf"]),
    name: text(input.name, "CTF definition name"),
    description: multiline(input.description, "CTF description", 10_000),
    difficulty: text(input.difficulty, "Difficulty", 80, false),
    suggested_paths_json: "[]",
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

function saveCtf(db: Db, id: string, input: Record<string, unknown>) {
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
  });

  syncChildren(db, "ctf_hints", "challenge_id", id, hints);
}

function saveLab(db: Db, id: string, input: Record<string, unknown>) {
  const blacklist = multiline(
    input.command_blacklist,
    "Command blacklist",
    10_000,
  )
    .split(/\r?\n/)
    .map((command) => command.trim())
    .filter(Boolean);

  if (blacklist.length > 200) {
    throw new InputError("The blacklist supports at most 200 entries.");
  }

  writeRow(db, "labs", {
    id,
    name: text(input.name, "Lab name", 200),
    base_image: text(input.base_image, "Base image", 500, false) || "",
    snapshot_image:
      text(input.snapshot_image, "Snapshot image", 500, false) || null,
    default_user: text(input.default_user, "Default user", 100),
    whitelist_enabled: boolean(
      input.whitelist_enabled,
      "Whitelist enabled",
    )
      ? 1
      : 0,
    command_blacklist_json: JSON.stringify(blacklist),
    setup_script: multiline(input.setup_script, "Setup script", 50_000),
  });
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

    if (entity === "homework") {
      const tests = list(input.tests, "Test cases", 100);
      const standardSolution = multiline(input.standard_solution_script, "Standard solution script");
      const baseXp = integer(input.total_base_xp, "Total Base XP");
      const totalPoints = baseXp + tests.reduce((sum: number, t) => sum + integer(object(t).xp_reward, "Test case XP"), 0);

      const mappedTests = tests.map((t) => {
        const test = object(t);
        return {
          id: identifier(test.id, "Test case ID"),
          setupScript: multiline(test.setup_script, "Test case setup script"),
          xpReward: integer(test.xp_reward, "Test case XP"),
          hidden: boolean(test.is_hidden, "Hidden test case"),
        };
      });

      // Pre-compute expected values by sending the standard solution as both the answer and standardSolution
      const graderResult = await runGrader({
        homeworkId: id,
        pathId: "",
        title: "",
        objective: "",
        baseXp,
        totalPoints,
        standardSolution,
        testCases: mappedTests,
      }, standardSolution);

      graderResult.results.forEach((result, idx) => {
        const test = object(tests[idx]);
        test.expected_output = result.expectedOutput;
        test.expected_folder = result.expectedFolder;
      });
    }

    const db = getDb();

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
          saveHomework(db, id, input);
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
          saveLab(db, id, input);
          break;
      }
    })();

    destination =
      `/admin/creator/${entity}?edit=${encodeURIComponent(id)}&saved=1`;
  } catch (error) {
    if (error instanceof InputError) {
      return { error: error.message };
    }

    console.error("Creator save failed", error);

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
            "Unassign this lab from homework and CTF challenges first.",
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
  } catch (error) {
    if (error instanceof InputError) {
      return { error: error.message };
    }

    console.error("Creator delete failed", error);

    return {
      error: "Unable to delete this item. Please refresh and try again.",
    };
  }

  revalidatePath("/", "layout");
  redirect(`/admin/creator/${entity}?deleted=1`);
}
