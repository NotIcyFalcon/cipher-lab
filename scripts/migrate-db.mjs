import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const JSON_ARRAY = (column) =>
  `TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(${column}) AND json_type(${column}) = 'array')`;

// Columns the application relies on. Some databases reached schema v13 through
// hand edits, so these are added only when missing.
const reconciledColumns = [
  ["homework", "setup_script", "TEXT NOT NULL DEFAULT ''"],
  ["homework_test_cases", "question_id", "TEXT"],
  ["homework_test_cases", "expected_output", "TEXT"],
  ["homework_test_cases", "expected_folder", "TEXT"],
  ["chapters", "objectives", JSON_ARRAY("objectives")],
  ["chapters", "objectives_json", JSON_ARRAY("objectives_json")],
  ["chapters", "reading_minutes", "INTEGER NOT NULL DEFAULT 0 CHECK (reading_minutes >= 0)"],
  ["ctfs", "suggested_paths_json", JSON_ARRAY("suggested_paths_json")],
  ["ctf_challenges", "suggested_paths_json", JSON_ARRAY("suggested_paths_json")],
  ["labs", "name", "TEXT NOT NULL DEFAULT ''"],
  ["labs", "initial_setup_script", "TEXT NOT NULL DEFAULT ''"],
  ["labs", "setup_script", "TEXT"],
  ["labs", "command_whitelist_json", JSON_ARRAY("command_whitelist_json")],
  ["labs", "runtime_service", "TEXT"],
];

function ensureColumns(db) {
  for (const [table, column, definition] of reconciledColumns) {
    const existing = db
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((row) => row.name);

    if (!existing.includes(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }
}

const migrations = [
  {
    version: 1,
    file: new URL("../migrations/001_initial.sql", import.meta.url),
  },
  {
    version: 2,
    file: new URL("../migrations/002_ctf.sql", import.meta.url),
  },
  {
    version: 3,
    file: new URL("../migrations/003_cms.sql", import.meta.url),
  },
  {
    version: 4,
    file: new URL("../migrations/004_admin_user.sql", import.meta.url),
  },
  {
    version: 5,
    file: new URL("../migrations/005_homework_base_xp.sql", import.meta.url),
  },
  {
    version: 6,
    file: new URL("../migrations/006_batch8.sql", import.meta.url),
  },
  {
    version: 7,
    file: new URL("../migrations/007_batch10.sql", import.meta.url),
  },
  {
    version: 8,
    file: new URL("../migrations/008_batch11.sql", import.meta.url),
  },
  {
    version: 9,
    file: new URL("../migrations/009_batch11_part2.sql", import.meta.url),
  },
  {
    version: 10,
    file: new URL("../migrations/010_batch12_labs.sql", import.meta.url),
  },
  {
    version: 11,
    file: new URL("../migrations/011_homework_questions.sql", import.meta.url),
  },
  {
    version: 12,
    file: new URL("../migrations/012_grading_queue.sql", import.meta.url),
  },
  {
    version: 13,
    file: new URL("../migrations/013_ctf_reconciliation.sql", import.meta.url),
  },
  {
    version: 14,
    before: ensureColumns,
    file: new URL("../migrations/014_schema_reconciliation.sql", import.meta.url),
  },
  {
    version: 15,
    file: new URL("../migrations/015_lab_recipes.sql", import.meta.url),
  },
  {
    version: 16,
    file: new URL("../migrations/016_homework_grader.sql", import.meta.url),
  },
];

const latestVersion = 16;

const databasePath = resolve(
  process.env.DATABASE_PATH || "./data/cyberbox.sqlite",
);

mkdirSync(dirname(databasePath), { recursive: true });

const db = new Database(databasePath, {
  timeout: 5000,
});

try {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const migrate = db.transaction(() => {
    let version = db.pragma("user_version", { simple: true });

    if (!Number.isInteger(version) || version < 0) {
      throw new Error(`Invalid database schema version: ${version}`);
    }

    if (version > latestVersion) {
      throw new Error(
        `Database version ${version} is newer than supported version ${latestVersion}.`,
      );
    }

    // Recognize an existing v1 database initialized without user_version.
    if (version === 0) {
      const schemaObjects = new Set(
        db
          .prepare(`
            SELECT type || ':' || name AS object_name
            FROM sqlite_master
            WHERE type IN ('table', 'view')
          `)
          .all()
          .map((row) => row.object_name),
      );

      if (schemaObjects.has("table:users")) {
        const requiredObjects = [
          "table:users",
          "table:reading_progress",
          "table:lab_completions",
          "table:homework_submissions",
          "view:homework_best",
          "view:user_xp",
        ];

        if (!requiredObjects.every((name) => schemaObjects.has(name))) {
          throw new Error(
            "The existing unversioned database does not contain the complete v1 schema.",
          );
        }

        version = 1;
        db.pragma("user_version = 1");
      }
    }

    for (const migration of migrations) {
      if (migration.version <= version) {
        continue;
      }

      const sql = readFileSync(migration.file, "utf8");

      migration.before?.(db);
      db.exec(sql);
      db.pragma(`user_version = ${migration.version}`);

      version = migration.version;
    }

    return version;
  });

  const version = migrate.immediate();

  if (process.argv.includes("--recover")) {
    const now = Date.now();

    db.transaction(() => {
      // Homework jobs interrupted by a restart simply run again.
      db.prepare(`
        UPDATE homework_jobs
        SET status = 'queued', locked_at = NULL, available_at = ?
        WHERE status = 'running'
      `).run(now);

      db.prepare(`
        UPDATE homework SET prep_status = 'queued' WHERE prep_status = 'preparing'
      `).run();

      // Pending submissions without a job left to finish them are failed.
      db.prepare(`
        UPDATE homework_submissions
        SET status = 'error',
            error = 'The server restarted before grading finished. Submit again.',
            finished_at = ?
        WHERE status = 'pending'
          AND id NOT IN (
            SELECT submission_id FROM homework_jobs
            WHERE kind = 'grade_submission' AND status = 'queued' AND submission_id IS NOT NULL
          )
      `).run(now);

      // A lab build in progress cannot survive a restart; queued ones still run.
      db.prepare(`
        UPDATE lab_builds
        SET status = 'failed',
            error = 'The server restarted before the build finished. Build again.',
            finished_at = ?
        WHERE status = 'building'
      `).run(now);

      db.prepare(`
        UPDATE labs
        SET build_status = CASE
              WHEN EXISTS (SELECT 1 FROM lab_builds b WHERE b.lab_id = labs.id AND b.status = 'queued') THEN 'queued'
              ELSE 'failed'
            END
        WHERE build_status = 'building'
      `).run();
    })();
  }

  console.log(`Cyber Box database ready (schema v${version}).`);
} finally {
  db.close();
}
