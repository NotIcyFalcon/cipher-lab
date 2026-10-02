CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('path', 'homework', 'ctf'))
);

CREATE TABLE learning_paths (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  difficulty TEXT,
  time_days INTEGER
);

CREATE TABLE chapters (
  id TEXT PRIMARY KEY,
  path_id TEXT NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_json TEXT NOT NULL,
  reading_points INTEGER NOT NULL,
  sequence_order INTEGER NOT NULL
);

CREATE TABLE labs (
  id TEXT PRIMARY KEY,
  base_image TEXT NOT NULL,
  snapshot_image TEXT,
  default_user TEXT NOT NULL,
  whitelist_enabled INTEGER NOT NULL CHECK (whitelist_enabled IN (0, 1)),
  command_blacklist_json TEXT
);

CREATE TABLE homework (
  id TEXT PRIMARY KEY,
  path_id TEXT NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  question_markdown TEXT NOT NULL,
  expected_result_description TEXT,
  standard_solution_script TEXT,
  lab_id TEXT REFERENCES labs(id) ON DELETE SET NULL
);

CREATE TABLE homework_test_cases (
  id TEXT PRIMARY KEY,
  homework_id TEXT NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  setup_script TEXT,
  xp_reward INTEGER NOT NULL,
  is_hidden INTEGER NOT NULL CHECK (is_hidden IN (0, 1))
);

CREATE TABLE ctf_challenges (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL,
  difficulty TEXT,
  lab_id TEXT REFERENCES labs(id) ON DELETE SET NULL
);

CREATE TABLE ctf_hints (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES ctf_challenges(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  penalty INTEGER NOT NULL,
  sequence_order INTEGER NOT NULL
);
