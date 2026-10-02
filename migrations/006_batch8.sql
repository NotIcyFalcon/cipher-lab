ALTER TABLE chapters
ADD COLUMN objectives TEXT NOT NULL DEFAULT '[]'
CHECK (json_valid(objectives) AND json_type(objectives) = 'array');

ALTER TABLE chapters
ADD COLUMN reading_minutes INTEGER NOT NULL DEFAULT 0
CHECK (reading_minutes >= 0);

ALTER TABLE labs
ADD COLUMN initial_setup_script TEXT NOT NULL DEFAULT '';

UPDATE labs
SET base_image = 'cyberbox-lab:2',
    default_user = 'Ronak',
    command_blacklist_json = COALESCE(
      command_blacklist_json,
      '["sudo","shutdown","reboot","poweroff","halt","rm -rf /","mkfs","mount","umount","dd"]'
    );

-- Rebuild homework and its children without lab_id or
-- expected_result_description.
CREATE TABLE homework_v8 (
  id TEXT PRIMARY KEY,
  path_id TEXT NOT NULL
    REFERENCES learning_paths(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Assignment',
  question_markdown TEXT NOT NULL,
  standard_solution_script TEXT NOT NULL DEFAULT '',
  total_base_xp INTEGER NOT NULL DEFAULT 0
    CHECK (total_base_xp >= 0)
);

INSERT INTO homework_v8 (
  id, path_id, question_markdown,
  standard_solution_script, total_base_xp
)
SELECT
  id, path_id, question_markdown,
  COALESCE(standard_solution_script, ''), total_base_xp
FROM homework;

CREATE TABLE homework_test_cases_v8 (
  id TEXT PRIMARY KEY,
  homework_id TEXT NOT NULL
    REFERENCES homework_v8(id) ON DELETE CASCADE,
  setup_script TEXT NOT NULL DEFAULT '',
  xp_reward INTEGER NOT NULL CHECK (xp_reward >= 0),
  is_hidden INTEGER NOT NULL CHECK (is_hidden IN (0, 1)),
  sequence_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO homework_test_cases_v8 (
  id, homework_id, setup_script, xp_reward, is_hidden, sequence_order
)
SELECT
  id,
  homework_id,
  COALESCE(setup_script, ''),
  xp_reward,
  is_hidden,
  ROW_NUMBER() OVER (
    PARTITION BY homework_id ORDER BY id
  ) - 1
FROM homework_test_cases;

DROP TABLE homework_test_cases;
DROP TABLE homework;

ALTER TABLE homework_v8 RENAME TO homework;
ALTER TABLE homework_test_cases_v8 RENAME TO homework_test_cases;

CREATE INDEX homework_path ON homework(path_id);
CREATE INDEX homework_tests_order
  ON homework_test_cases(homework_id, sequence_order, id);

-- Topics -> CTFs -> Universes -> Challenges.
CREATE TABLE ctfs (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT '',
  sequence_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE ctf_universes (
  id TEXT PRIMARY KEY,
  ctf_id TEXT NOT NULL REFERENCES ctfs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sequence_order INTEGER NOT NULL DEFAULT 0
);

-- Preserve existing DB-authored challenges in an explicit migrated grouping.
INSERT INTO ctfs (id, topic_id, name, description)
SELECT
  'legacy-ctf:' || t.id,
  t.id,
  t.name || ' CTF',
  'Migrated CTF grouping'
FROM topics t
WHERE EXISTS (
  SELECT 1 FROM ctf_challenges c WHERE c.topic_id = t.id
);

INSERT INTO ctf_universes (id, ctf_id, name)
SELECT
  'legacy-universe:' || topic_id,
  id,
  'Challenges'
FROM ctfs;

CREATE TABLE ctf_challenges_v8 (
  id TEXT PRIMARY KEY,
  universe_id TEXT NOT NULL
    REFERENCES ctf_universes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  points INTEGER NOT NULL CHECK (points >= 0),
  difficulty TEXT NOT NULL DEFAULT '',
  lab_id TEXT REFERENCES labs(id) ON DELETE SET NULL,
  flag_hash TEXT CHECK (
    flag_hash IS NULL OR (
      length(flag_hash) = 64
      AND flag_hash NOT GLOB '*[^a-f0-9]*'
    )
  ),
  sequence_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO ctf_challenges_v8 (
  id, universe_id, title, description,
  points, difficulty, lab_id, sequence_order
)
SELECT
  id,
  'legacy-universe:' || topic_id,
  title,
  COALESCE(description, ''),
  points,
  COALESCE(difficulty, ''),
  lab_id,
  ROW_NUMBER() OVER (
    PARTITION BY topic_id ORDER BY id
  ) - 1
FROM ctf_challenges;

CREATE TABLE ctf_hints_v8 (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL
    REFERENCES ctf_challenges_v8(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  penalty INTEGER NOT NULL CHECK (penalty >= 0),
  sequence_order INTEGER NOT NULL
);

INSERT INTO ctf_hints_v8
SELECT id, challenge_id, text, penalty, sequence_order
FROM ctf_hints;

-- Stable hint identity and a purchase-time penalty snapshot.
CREATE TABLE ctf_hint_purchases (
  user_id TEXT NOT NULL REFERENCES users(id),
  challenge_id TEXT NOT NULL
    REFERENCES ctf_challenges_v8(id) ON DELETE CASCADE,
  hint_id TEXT NOT NULL
    REFERENCES ctf_hints_v8(id) ON DELETE CASCADE,
  penalty_xp INTEGER NOT NULL CHECK (penalty_xp >= 0),
  unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, hint_id)
);

INSERT INTO ctf_hint_purchases (
  user_id, challenge_id, hint_id, penalty_xp, unlocked_at
)
SELECT
  u.user_id,
  u.challenge_id,
  h.id,
  h.penalty,
  u.unlocked_at
FROM ctf_hint_unlocks u
JOIN (
  SELECT
    id,
    challenge_id,
    penalty,
    ROW_NUMBER() OVER (
      PARTITION BY challenge_id ORDER BY sequence_order, id
    ) - 1 AS hint_index
  FROM ctf_hints
) h
  ON h.challenge_id = u.challenge_id
 AND h.hint_index = u.hint_index;

DROP TABLE ctf_hint_unlocks;
DROP TABLE ctf_hints;
DROP TABLE ctf_challenges;

ALTER TABLE ctf_challenges_v8 RENAME TO ctf_challenges;
ALTER TABLE ctf_hints_v8 RENAME TO ctf_hints;

CREATE INDEX ctfs_topic ON ctfs(topic_id, sequence_order, id);
CREATE INDEX universes_ctf ON ctf_universes(ctf_id, sequence_order, id);
CREATE INDEX challenges_universe
  ON ctf_challenges(universe_id, sequence_order, id);
CREATE INDEX hints_challenge
  ON ctf_hints(challenge_id, sequence_order, id);
CREATE INDEX hint_purchase_account
  ON ctf_hint_purchases(user_id, challenge_id);
