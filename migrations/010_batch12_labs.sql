-- migrations/010_batch12_labs.sql

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
  NULL AS setup_script, id AS name
FROM labs;

DROP TABLE labs;
ALTER TABLE labs_batch12 RENAME TO labs;
CREATE UNIQUE INDEX IF NOT EXISTS labs_name_unique ON labs(name);
