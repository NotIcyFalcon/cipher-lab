-- migrations/009_batch11_part2.sql
--
-- Intentionally empty. This file used to repeat the columns that
-- 008_batch11.sql already adds (ctfs.suggested_paths_json,
-- ctf_challenges.suggested_paths_json, chapters.objectives_json), which made
-- fresh migrations fail with "duplicate column name". The version number is
-- kept so existing databases at user_version >= 9 stay in sequence.
SELECT 1;
