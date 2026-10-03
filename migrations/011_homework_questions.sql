-- migrations/011_homework_questions.sql

CREATE TABLE homework_questions (
  id TEXT PRIMARY KEY,
  homework_id TEXT NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  question_markdown TEXT NOT NULL,
  setup_script TEXT NOT NULL DEFAULT '',
  standard_solution_script TEXT NOT NULL DEFAULT '',
  sequence_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX homework_questions_order
ON homework_questions(homework_id, sequence_order, id);

INSERT INTO homework_questions (
  id,
  homework_id,
  title,
  question_markdown,
  setup_script,
  standard_solution_script,
  sequence_order
)
SELECT
  id || ':question:1',
  id,
  title,
  question_markdown,
  setup_script,
  standard_solution_script,
  0
FROM homework;

ALTER TABLE homework_test_cases ADD COLUMN question_id TEXT;

UPDATE homework_test_cases
SET question_id = (
  SELECT id
  FROM homework_questions
  WHERE homework_questions.homework_id = homework_test_cases.homework_id
  ORDER BY sequence_order
  LIMIT 1
);

-- Note: We will leave the old columns in the homework table for now (question_markdown, setup_script, standard_solution_script)
-- to avoid breaking running code before it's deployed, but they are deprecated.
