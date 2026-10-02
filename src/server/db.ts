import "server-only";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const globalForDb = globalThis as typeof globalThis & {
  cyberboxDb?: Database.Database;
};

function migrateCreatorSchema(db: Database.Database) {
  const hasColumn = (table: string, column: string) =>
    (
      db.prepare(`PRAGMA table_info(${table})`).all() as {
        name: string;
      }[]
    ).some((item) => item.name === column);

  db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ctfs (
        id TEXT PRIMARY KEY,
        topic_id TEXT NOT NULL
          REFERENCES topics(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        difficulty TEXT,
        suggested_paths_json TEXT NOT NULL DEFAULT '[]',
        sequence_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_ctfs_topic
        ON ctfs(topic_id);

      CREATE TABLE IF NOT EXISTS ctf_universes (
        id TEXT PRIMARY KEY,
        ctf_id TEXT NOT NULL
          REFERENCES ctfs(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        sequence_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_ctf_universes_ctf
        ON ctf_universes(ctf_id);
    `);

    if (!hasColumn("ctf_challenges", "universe_id")) {
      db.exec(`
        ALTER TABLE ctf_challenges
        ADD COLUMN universe_id TEXT
          REFERENCES ctf_universes(id) ON DELETE CASCADE
      `);
    }

    if (!hasColumn("homework", "setup_script")) {
      db.exec("ALTER TABLE homework ADD COLUMN setup_script TEXT");
    }

    if (!hasColumn("labs", "name")) {
      db.exec(`
        ALTER TABLE labs
        ADD COLUMN name TEXT NOT NULL DEFAULT ''
      `);

      db.exec(`
        UPDATE labs
        SET name = COALESCE(NULLIF(base_image, ''), id)
        WHERE name = ''
      `);
    }

    /*
     * Preserve existing challenges and their IDs. Completion and hint
     * purchase records therefore remain associated with the same challenges.
     *
     * Each flattened topic gets a CTF and a default universe containing
     * its previously direct children.
     */
    const legacyTopics = db.prepare(`
      SELECT DISTINCT t.id, t.name, t.description
      FROM topics t
      JOIN ctf_challenges ch ON ch.topic_id = t.id
      WHERE ch.universe_id IS NULL
    `).all() as {
      id: string;
      name: string;
      description: string | null;
    }[];

    for (const topic of legacyTopics) {
      const ctfId = randomUUID();
      const universeId = randomUUID();

      db.prepare(`
        INSERT INTO ctfs
          (id, topic_id, name, description, suggested_paths_json)
        VALUES (?, ?, ?, ?, '[]')
      `).run(ctfId, topic.id, topic.name, topic.description);

      db.prepare(`
        INSERT INTO ctf_universes (id, ctf_id, name, description)
        VALUES (?, ?, ?, ?)
      `).run(
        universeId,
        ctfId,
        "Default universe",
        "Challenges migrated from the previous catalog.",
      );

      db.prepare(`
        UPDATE ctf_challenges
        SET universe_id = ?
        WHERE topic_id = ? AND universe_id IS NULL
      `).run(universeId, topic.id);
    }

    const unmigrated = db.prepare(`
      SELECT id FROM ctf_challenges
      WHERE universe_id IS NULL
      LIMIT 1
    `).get();

    if (unmigrated) {
      throw new Error(
        "CTF migration failed: a challenge has no valid parent topic.",
      );
    }

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ctf_challenges_universe
        ON ctf_challenges(universe_id);

      CREATE TRIGGER IF NOT EXISTS ctf_challenges_require_universe_insert
      BEFORE INSERT ON ctf_challenges
      WHEN NEW.universe_id IS NULL
      BEGIN
        SELECT RAISE(ABORT, 'A challenge must belong to a universe');
      END;

      CREATE TRIGGER IF NOT EXISTS ctf_challenges_require_universe_update
      BEFORE UPDATE OF universe_id ON ctf_challenges
      WHEN NEW.universe_id IS NULL
      BEGIN
        SELECT RAISE(ABORT, 'A challenge must belong to a universe');
      END;

      /*
       * topic_id is retained for compatibility with the flattened schema,
       * including any existing NOT NULL constraint. It is derived metadata,
       * not the authoritative challenge parent.
       */
      CREATE TRIGGER IF NOT EXISTS ctf_challenges_sync_topic_insert
      AFTER INSERT ON ctf_challenges
      BEGIN
        UPDATE ctf_challenges
        SET topic_id = (
          SELECT c.topic_id
          FROM ctf_universes u
          JOIN ctfs c ON c.id = u.ctf_id
          WHERE u.id = NEW.universe_id
        )
        WHERE id = NEW.id;
      END;

      CREATE TRIGGER IF NOT EXISTS ctf_challenges_sync_topic_update
      AFTER UPDATE OF universe_id ON ctf_challenges
      BEGIN
        UPDATE ctf_challenges
        SET topic_id = (
          SELECT c.topic_id
          FROM ctf_universes u
          JOIN ctfs c ON c.id = u.ctf_id
          WHERE u.id = NEW.universe_id
        )
        WHERE id = NEW.id;
      END;

      CREATE TRIGGER IF NOT EXISTS ctf_universes_sync_challenge_topics
      AFTER UPDATE OF ctf_id ON ctf_universes
      BEGIN
        UPDATE ctf_challenges
        SET topic_id = (
          SELECT topic_id FROM ctfs WHERE id = NEW.ctf_id
        )
        WHERE universe_id = NEW.id;
      END;

      CREATE TRIGGER IF NOT EXISTS ctfs_sync_challenge_topics
      AFTER UPDATE OF topic_id ON ctfs
      BEGIN
        UPDATE ctf_challenges
        SET topic_id = NEW.topic_id
        WHERE universe_id IN (
          SELECT id FROM ctf_universes WHERE ctf_id = NEW.id
        );
      END;
    `);

    const foreignKeyErrors = db.pragma("foreign_key_check") as unknown[];

    if (foreignKeyErrors.length > 0) {
      throw new Error("Foreign-key validation failed during Creator migration.");
    }
  })();
}

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

    try {
      migrateCreatorSchema(db);
    } catch (error) {
      db.close();
      throw error;
    }

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
