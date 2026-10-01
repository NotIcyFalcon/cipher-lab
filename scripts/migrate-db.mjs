import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const migrations = [
  {
    version: 1,
    file: new URL("../migrations/001_initial.sql", import.meta.url),
  },
  {
    version: 2,
    file: new URL("../migrations/002_ctf.sql", import.meta.url),
  },
];

const latestVersion = 2;

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

      db.exec(sql);
      db.pragma(`user_version = ${migration.version}`);

      version = migration.version;
    }

    return version;
  });

  const version = migrate.immediate();

  if (process.argv.includes("--recover")) {
    db.prepare(`
      UPDATE homework_submissions
      SET status = 'error',
          error = 'The server restarted before grading finished. Submit again.',
          finished_at = ?
      WHERE status = 'pending'
    `).run(Date.now());
  }

  console.log(`Cyber Box database ready (schema v${version}).`);
} finally {
  db.close();
}
