-- migrations/016_homework_grader.sql
--
-- Homework v2. Each homework has an environment (a base image, packages,
-- files and a build script, built once into a Docker image). Saving a
-- homework "prepares" it: the reference solution runs once against every
-- test case and the results are stored as each test's expected_json.
-- Grading runs the student's script against the same tests and compares.

ALTER TABLE homework ADD COLUMN environment_json TEXT NOT NULL DEFAULT '{}'
CHECK (json_valid(environment_json));

-- Hash of everything that affects expected results (environment, solutions,
-- test setup/arguments/input). A homework is ready when prepared_hash equals
-- definition_hash.
ALTER TABLE homework ADD COLUMN definition_hash TEXT;
ALTER TABLE homework ADD COLUMN prepared_hash TEXT;

ALTER TABLE homework ADD COLUMN prep_status TEXT NOT NULL DEFAULT 'draft'
CHECK (prep_status IN ('draft', 'queued', 'preparing', 'ready', 'failed'));

ALTER TABLE homework ADD COLUMN prep_error TEXT;
ALTER TABLE homework ADD COLUMN prep_log TEXT NOT NULL DEFAULT '';
ALTER TABLE homework ADD COLUMN env_image TEXT;
ALTER TABLE homework ADD COLUMN prepared_at INTEGER;

ALTER TABLE homework_questions ADD COLUMN time_limit_sec INTEGER NOT NULL DEFAULT 5
CHECK (time_limit_sec BETWEEN 1 AND 30);

ALTER TABLE homework_questions ADD COLUMN compare_json TEXT NOT NULL
DEFAULT '{"stdout":"trim","exitCode":true,"files":true,"permissions":false}'
CHECK (json_valid(compare_json));

ALTER TABLE homework_test_cases ADD COLUMN args TEXT NOT NULL DEFAULT '';
ALTER TABLE homework_test_cases ADD COLUMN stdin TEXT NOT NULL DEFAULT '';
ALTER TABLE homework_test_cases ADD COLUMN expected_json TEXT
CHECK (expected_json IS NULL OR json_valid(expected_json));

ALTER TABLE homework_submissions ADD COLUMN question_id TEXT;

CREATE INDEX IF NOT EXISTS homework_submission_question
  ON homework_submissions (user_id, question_id, id DESC);

CREATE INDEX IF NOT EXISTS homework_tests_question
  ON homework_test_cases (question_id, sequence_order, id);

-- The old grader ran the homework-level and question-level setup scripts in
-- each test's folder before the test's own setup. Fold them into each test's
-- setup so existing assignments behave the same.
UPDATE homework_test_cases
SET setup_script =
  COALESCE((SELECT h.setup_script FROM homework h WHERE h.id = homework_test_cases.homework_id), '')
  || char(10) ||
  COALESCE((SELECT q.setup_script FROM homework_questions q WHERE q.id = homework_test_cases.question_id), '')
  || char(10) ||
  setup_script
WHERE trim(COALESCE((SELECT h.setup_script FROM homework h WHERE h.id = homework_test_cases.homework_id), '')) <> ''
   OR trim(COALESCE((SELECT q.setup_script FROM homework_questions q WHERE q.id = homework_test_cases.question_id), '')) <> '';

UPDATE homework SET setup_script = '';
UPDATE homework_questions SET setup_script = '';

-- Best score per question; a homework's best is the sum over its questions.
DROP VIEW user_xp;
DROP VIEW homework_best;

CREATE VIEW homework_question_best AS
SELECT
  user_id,
  homework_id,
  question_id,
  MAX(awarded_xp) AS best_xp
FROM homework_submissions
WHERE status = 'graded'
GROUP BY user_id, homework_id, question_id;

CREATE VIEW homework_best AS
SELECT
  user_id,
  homework_id,
  SUM(best_xp) AS best_xp
FROM homework_question_best
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
  ), 0) AS homework_xp,

  COALESCE((
    SELECT SUM(c.awarded_xp)
    FROM ctf_completions c
    WHERE c.user_id = u.id
  ), 0) AS ctf_xp

FROM users u;
