-- Add suggested paths to CTFs and CTF Challenges
ALTER TABLE ctfs
ADD COLUMN suggested_paths_json TEXT NOT NULL DEFAULT '[]'
CHECK (json_valid(suggested_paths_json) AND json_type(suggested_paths_json) = 'array');

ALTER TABLE ctf_challenges
ADD COLUMN suggested_paths_json TEXT NOT NULL DEFAULT '[]'
CHECK (json_valid(suggested_paths_json) AND json_type(suggested_paths_json) = 'array');

-- Add Chapter Goals (objectives) to Chapters
ALTER TABLE chapters
ADD COLUMN objectives_json TEXT NOT NULL DEFAULT '[]'
CHECK (json_valid(objectives_json) AND json_type(objectives_json) = 'array');
