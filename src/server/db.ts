import "server-only";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const globalForDb = globalThis as typeof globalThis & {
  cyberboxDb?: Database.Database;
};

export function getDb() {
  if (!globalForDb.cyberboxDb) {
    const db = new Database(
      process.env.DATABASE_PATH || "./data/cyberbox.sqlite",
      {
        fileMustExist: true,
        timeout: 5000,
      },
    );

    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // Cache statements to prevent V8 Garbage Collector from destroying them
    // and causing the RemoveEnvironmentCleanupHook assertion crash in Next.js
    const statementCache = new Map<string, Database.Statement>();
    const originalPrepare = db.prepare.bind(db);
    // @ts-expect-error Monkeypatch prepare to avoid GC crashes in Next.js
    db.prepare = (sql: string) => {
      let stmt = statementCache.get(sql);
      if (!stmt) {
        stmt = originalPrepare(sql);
        statementCache.set(sql, stmt);
      }
      return stmt;
    };

    globalForDb.cyberboxDb = db;
  }

  return globalForDb.cyberboxDb;
}
