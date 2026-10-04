-- migrations/014_schema_reconciliation.sql
--
-- Brings every database to the same shape, whether it was built by running
-- 001-013 or patched by hand. Missing columns are added beforehand by
-- scripts/migrate-db.mjs (SQLite has no ADD COLUMN IF NOT EXISTS); this file
-- only reconciles data.

-- Homework topics were folded into learning-path topics in 008.
UPDATE topics
SET type = 'path'
WHERE type = 'homework';

-- Chapter goals: objectives_json is what the Creator edits and what the
-- learning page reads. Recover goals that only exist in the 006 column, then
-- keep the legacy column identical.
UPDATE chapters
SET objectives_json = objectives
WHERE objectives_json = '[]'
  AND objectives <> '[]';

UPDATE chapters
SET objectives = objectives_json
WHERE objectives <> objectives_json;

-- Lab setup scripts: 010 created setup_script as NULL for existing labs,
-- hiding their scripts from the Creator.
UPDATE labs
SET setup_script = initial_setup_script
WHERE (setup_script IS NULL OR setup_script = '')
  AND initial_setup_script <> '';

-- Every lab needs a unique, non-empty name for the Creator dropdowns.
UPDATE labs
SET name = id
WHERE trim(name) = '';

UPDATE labs
SET name = name || ' (' || substr(id, 1, 8) || ')'
WHERE name IN (
  SELECT name FROM labs GROUP BY name HAVING COUNT(*) > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS labs_name_unique ON labs(name);
