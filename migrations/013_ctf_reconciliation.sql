-- migrations/013_ctf_reconciliation.sql

CREATE TABLE ctf_completions_new (
  user_id TEXT NOT NULL REFERENCES users(id),
  challenge_id TEXT NOT NULL REFERENCES ctf_challenges(id) ON DELETE CASCADE,
  awarded_xp INTEGER NOT NULL CHECK (awarded_xp >= 0),
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, challenge_id)
);

INSERT INTO ctf_completions_new (user_id, challenge_id, awarded_xp, completed_at)
SELECT user_id, challenge_id, awarded_xp, completed_at FROM ctf_completions;

DROP VIEW user_xp;
DROP TABLE ctf_completions;
ALTER TABLE ctf_completions_new RENAME TO ctf_completions;

CREATE VIEW user_xp AS
SELECT
  u.id AS user_id,

  COALESCE((
    SELECT SUM(r.xp)
    FROM reading_progress r
    WHERE r.user_id = u.id
  ), 0) AS reading_xp,

  COALESCE((
    SELECT SUM(l.xp)
    FROM lab_completions l
    WHERE l.user_id = u.id
  ), 0) AS labs_xp,

  COALESCE((
    SELECT SUM(h.best_xp)
    FROM homework_best h
    WHERE h.user_id = u.id
  ), 0) AS homework_xp,

  COALESCE((
    SELECT SUM(c.awarded_xp)
    FROM ctf_completions c
    WHERE c.user_id = u.id
  ), 0) AS ctf_xp

FROM users u;
