import "server-only";
import Database from "better-sqlite3";

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

    globalForDb.cyberboxDb = db;
  }

  return globalForDb.cyberboxDb;
}
