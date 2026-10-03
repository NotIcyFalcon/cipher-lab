-- migrations/012_grading_queue.sql

CREATE TABLE homework_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (
    kind IN ('prepare_expected', 'grade_submission')
  ),
  homework_id TEXT NOT NULL,
  question_id TEXT,
  submission_id INTEGER,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'running', 'complete', 'failed')
  ),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at INTEGER NOT NULL,
  locked_at INTEGER,
  error TEXT,
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);

CREATE INDEX homework_jobs_ready
ON homework_jobs(status, available_at, id);
