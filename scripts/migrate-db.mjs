import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const filename = resolve(
  process.env.DATABASE_PATH || "./data/cyberbox.sqlite",
);

mkdirSync(dirname(filename), { recursive: true });

const db = new Database(filename, { timeout: 5000 });

try {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const version = db.pragma("user_version", { simple: true });

  if (version > 1) {
    throw new Error(`Unsupported database version: ${version}`);
  }

  if (version === 0) {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const sqlPath = resolve(__dirname, "../migrations/001_initial.sql");
    const sql = readFileSync(sqlPath, "utf8");

    db.transaction(() => {
      db.exec(sql);
      db.pragma("user_version = 1");
    }).immediate();
  }

  if (process.argv.includes("--recover")) {
    db.prepare(`
      UPDATE homework_submissions
      SET status = 'error',
          error = 'The server restarted before grading finished. Submit again.',
          finished_at = ?
      WHERE status = 'pending'
    `).run(Date.now());
  }

  console.log("Cyber Box database ready.");
} finally {
  db.close();
}
