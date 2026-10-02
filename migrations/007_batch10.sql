ALTER TABLE homework ADD COLUMN setup_script TEXT NOT NULL DEFAULT '';
ALTER TABLE labs ADD COLUMN name TEXT NOT NULL DEFAULT '';
UPDATE labs SET name = COALESCE(NULLIF(base_image, ''), id) WHERE name = '';
