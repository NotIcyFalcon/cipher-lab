CREATE TABLE ctf_hint_unlocks (
  user_id TEXT NOT NULL REFERENCES users(id),
  challenge_id TEXT NOT NULL,
  hint_index INTEGER NOT NULL CHECK (hint_index >= 0),
  unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, challenge_id, hint_index)
);

CREATE TABLE ctf_completions (
  user_id TEXT NOT NULL REFERENCES users(id),
  challenge_id TEXT NOT NULL,
  awarded_xp INTEGER NOT NULL CHECK (awarded_xp >= 0),
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, challenge_id)
);

DROP VIEW user_xp;

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
