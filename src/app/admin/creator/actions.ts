"use server";

import { randomUUID, createHash } from "node:crypto";
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

      case "lab": {
        let completionCodeHash = text(block.completionCodeHash, "Completion Code", 200, false);
        if (completionCodeHash && !/^[a-f0-9]{64}$/i.test(completionCodeHash)) {
          completionCodeHash = createHash("sha256")
            .update(completionCodeHash.trim().toLowerCase())
            .digest("hex");
        }

        return {
          id,
          type,
          labId: parentId(db, "labs", block.labId, "Block lab"),
          title: text(block.title, "Lab block title"),
          objective: multiline(block.objective, "Lab objective", 10_000, true),
          hint: multiline(block.hint, "Lab hint", 10_000),
          points: integer(block.points, "Lab points"),
          completionCodeHash: completionCodeHash || undefined,
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

function saveHomework(db: Db, id: string, input: Record<string, unknown>) {
  const questions = list(input.questions, "Questions", 10);
  const questionRows: Row[] = [];
  const testRows: Row[] = [];

  questions.forEach((qValue, index) => {
    const q = object(qValue);
    const qId = identifier(q.id, "Question ID");

    questionRows.push({
      id: qId,
      homework_id: id,
      title: text(q.title, "Question Title", 200),
      question_markdown: multiline(q.question_markdown, "Question Markdown", 50_000, true),
      setup_script: multiline(q.setup_script, "Setup script", 50_000, false),
      standard_solution_script: multiline(q.standard_solution_script, "Standard solution script", 50_000, false),
      sequence_order: index,
    });

    const tests = list(q.tests, "Test cases", 100);
    tests.forEach((tValue) => {
      const test = object(tValue);
      testRows.push({
        id: identifier(test.id, "Test case ID"),
        homework_id: id,
        question_id: qId,
        setup_script: multiline(test.setup_script, "Test case setup script", 50_000, false),
        xp_reward: integer(test.xp_reward, "Test case XP"),
        is_hidden: boolean(test.is_hidden, "Hidden test case") ? 1 : 0,
      });
    });
  });

  writeRow(db, "homework", {
    id,
    path_id: parentId(db, "learning_paths", input.path_id, "Learning path"),
    title: text(input.title, "Title", 200),
    total_base_xp: integer(input.total_base_xp, "Total Base XP"),
  });

  syncChildren(db, "homework_questions", "homework_id", id, questionRows);
  syncChildren(db, "homework_test_cases", "homework_id", id, testRows);
  
  db.prepare(`
    INSERT INTO homework_jobs (kind, homework_id, available_at, created_at)
    VALUES ('prepare_expected', ?, strftime('%s', 'now'), strftime('%s', 'now'))
  `).run(id);
}

function saveCtfDefinition(db: Db, id: string, input: Record<string, unknown>) {
  writeRow(db, "ctfs", {
    id,
    topic_id: requireTopic(db, input.topic_id, ["ctf"]),
    name: text(input.name, "CTF definition name"),
    description: multiline(input.description, "CTF description", 10_000),
    difficulty: text(input.difficulty, "Difficulty", 80, false),
    suggested_paths_json: JSON.stringify(
      list(input.suggested_path_ids, "Suggested paths", 10).map((id) =>
        identifier(id, "Suggested path ID"),
      ),
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
  const raw = text(input.flag_hash, "Flag", 1024, false);

  if (!raw) {
    return existingHash;
  }

  return createHash("sha256")
    .update(raw.trim().toLowerCase(), "utf8")
    .digest("hex");
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
    suggested_paths_json: JSON.stringify(
      list(input.suggested_path_ids, "Suggested paths", 10).map((id) =>
        identifier(id, "Suggested path ID"),
      ),
    ),
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
    base_image: "ubuntu:latest",
    snapshot_image: null,
    default_user: text(input.default_user, "Default user", 100),
    whitelist_enabled: boolean(
      input.whitelist_enabled,
      "Whitelist enabled",
    )
      ? 1
      : 0,
    command_blacklist_json: JSON.stringify(blacklist),
    initial_setup_script: multiline(input.setup_script, "Setup script", 50_000),
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
