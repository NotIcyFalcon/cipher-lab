-- migrations/010_batch12_labs.sql

-- The runner keeps foreign_keys = ON (it cannot be changed inside a
-- transaction), so DROP TABLE labs below performs an implicit DELETE that
-- fires ctf_challenges.lab_id ON DELETE SET NULL. Remember the assignments
-- first and restore them after the rebuild.
CREATE TEMP TABLE batch12_lab_refs AS
SELECT id, lab_id
FROM ctf_challenges
WHERE lab_id IS NOT NULL;

CREATE TABLE labs_batch12 (
  id TEXT PRIMARY KEY,
  base_image TEXT NOT NULL,
  snapshot_image TEXT,
  default_user TEXT NOT NULL,
  whitelist_enabled INTEGER NOT NULL CHECK (whitelist_enabled IN (0, 1)),
  command_blacklist_json TEXT,
  command_whitelist_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(command_whitelist_json) AND json_type(command_whitelist_json) = 'array'),
  initial_setup_script TEXT NOT NULL DEFAULT '',
  setup_script TEXT,
  name TEXT NOT NULL DEFAULT '',
  runtime_service TEXT
);

INSERT INTO labs_batch12 (
  id, base_image, snapshot_image, default_user, whitelist_enabled,
  command_blacklist_json, command_whitelist_json, initial_setup_script,
  setup_script, name
)
SELECT
  id, base_image, snapshot_image, default_user, whitelist_enabled,
  command_blacklist_json, command_whitelist_json, initial_setup_script,
  NULLIF(initial_setup_script, '') AS setup_script,
  -- Keep an existing name when it is unique; otherwise fall back to the ID
  -- so the unique index below can be created.
  CASE
    WHEN trim(name) <> ''
      AND (SELECT COUNT(*) FROM labs other WHERE other.name = labs.name) = 1
      THEN name
    ELSE id
  END AS name
FROM labs;

DROP TABLE labs;
ALTER TABLE labs_batch12 RENAME TO labs;
CREATE UNIQUE INDEX IF NOT EXISTS labs_name_unique ON labs(name);

UPDATE ctf_challenges
SET lab_id = (
  SELECT r.lab_id FROM batch12_lab_refs r WHERE r.id = ctf_challenges.id
)
WHERE id IN (SELECT id FROM batch12_lab_refs)
  AND (SELECT r.lab_id FROM batch12_lab_refs r WHERE r.id = ctf_challenges.id)
      IN (SELECT id FROM labs);

DROP TABLE batch12_lab_refs;
