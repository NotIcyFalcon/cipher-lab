CREATE TABLE users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL
);

INSERT INTO users (id, display_name)
VALUES ('ronak', 'Ronak');

CREATE TABLE reading_progress (
  user_id TEXT NOT NULL REFERENCES users(id),
  lesson_id TEXT NOT NULL,
  xp INTEGER NOT NULL CHECK (xp >= 0),
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE lab_completions (
  user_id TEXT NOT NULL REFERENCES users(id),
  challenge_id TEXT NOT NULL,
  xp INTEGER NOT NULL CHECK (xp >= 0),
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, challenge_id)
);

CREATE TABLE homework_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  homework_id TEXT NOT NULL,

  filename TEXT NOT NULL,
  code TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'graded', 'error')),

  total_points INTEGER NOT NULL CHECK (total_points > 0),
  total_tests INTEGER NOT NULL CHECK (total_tests > 0),

  passed_tests INTEGER NOT NULL DEFAULT 0
    CHECK (passed_tests >= 0 AND passed_tests <= total_tests),

  awarded_xp INTEGER NOT NULL DEFAULT 0
    CHECK (awarded_xp >= 0 AND awarded_xp <= total_points),

  results_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(results_json)),

  error TEXT,
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);

CREATE INDEX homework_submission_history
  ON homework_submissions (user_id, homework_id, id DESC);

CREATE INDEX homework_submission_scores
  ON homework_submissions (user_id, homework_id, awarded_xp DESC)
  WHERE status = 'graded';

CREATE VIEW homework_best AS
SELECT
  user_id,
  homework_id,
  MAX(awarded_xp) AS best_xp
FROM homework_submissions
WHERE status = 'graded'
GROUP BY user_id, homework_id;

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
  ), 0) AS homework_xp

FROM users u;
