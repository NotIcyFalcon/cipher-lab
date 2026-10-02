-- Existing homework-topic categories become learning-path categories.
-- Homework continues to inherit its category through learning_paths.topic_id.
UPDATE topics
SET type = 'path'
WHERE type = 'homework';

ALTER TABLE labs
ADD COLUMN command_whitelist_json TEXT NOT NULL DEFAULT '[]'
CHECK (
  json_valid(command_whitelist_json)
  AND json_type(command_whitelist_json) = 'array'
);

ALTER TABLE labs
ADD COLUMN completion_code_hash TEXT
CHECK (
  completion_code_hash IS NULL
  OR (
    length(completion_code_hash) = 64
    AND completion_code_hash NOT GLOB '*[^a-f0-9]*'
  )
);

-- Required base image for all labs.
UPDATE labs
SET base_image = 'cyberbox-lab:2';

-- Preserve existing explicitly configured blacklists.
UPDATE labs
SET command_blacklist_json =
  '["sudo","su","shutdown","reboot","poweroff","halt","mkfs","mount","umount","dd","rm -rf /"]'
WHERE command_blacklist_json IS NULL
   OR trim(command_blacklist_json) = '';

-- Add suggested paths to CTFs and CTF Challenges
ALTER TABLE ctfs
ADD COLUMN suggested_paths_json TEXT NOT NULL DEFAULT '[]'
CHECK (json_valid(suggested_paths_json) AND json_type(suggested_paths_json) = 'array');

ALTER TABLE ctf_challenges
ADD COLUMN suggested_paths_json TEXT NOT NULL DEFAULT '[]'
CHECK (json_valid(suggested_paths_json) AND json_type(suggested_paths_json) = 'array');

-- Add flag hash for CTF Challenges
ALTER TABLE ctf_challenges
ADD COLUMN flag_hash TEXT
CHECK (flag_hash IS NULL OR length(flag_hash) >= 1);

-- Add Chapter Goals (objectives) to Chapters
ALTER TABLE chapters
ADD COLUMN objectives_json TEXT NOT NULL DEFAULT '[]'
CHECK (json_valid(objectives_json) AND json_type(objectives_json) = 'array');
