-- migrations/015_lab_recipes.sql
--
-- Labs become recipes: one or more machines, each built once into its own
-- Docker image and started fresh for every session. lab_builds keeps the
-- build queue and history; labs.current_build_id points at the last
-- successful build, which is what sessions run.

ALTER TABLE labs ADD COLUMN description TEXT NOT NULL DEFAULT '';

ALTER TABLE labs ADD COLUMN recipe_json TEXT NOT NULL DEFAULT '{}'
CHECK (json_valid(recipe_json));

ALTER TABLE labs ADD COLUMN build_status TEXT NOT NULL DEFAULT 'draft'
CHECK (build_status IN ('draft', 'queued', 'building', 'ready', 'failed'));

ALTER TABLE labs ADD COLUMN current_build_id INTEGER;

ALTER TABLE labs ADD COLUMN built_recipe_hash TEXT;

CREATE TABLE lab_builds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lab_id TEXT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'building', 'succeeded', 'failed')),
  recipe_json TEXT NOT NULL CHECK (json_valid(recipe_json)),
  recipe_hash TEXT NOT NULL,
  images_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(images_json)),
  log TEXT NOT NULL DEFAULT '',
  error TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER
);

CREATE INDEX lab_builds_queue ON lab_builds(status, id);
CREATE INDEX lab_builds_lab ON lab_builds(lab_id, id DESC);

-- Convert existing labs into single-machine recipes that match the old
-- shared lab image: same tools, the same README and hidden clue, and the old
-- setup script as the build script.
WITH normalized AS (
  SELECT
    id,
    CASE
      WHEN lower(trim(default_user)) <> ''
        AND length(lower(trim(default_user))) <= 31
        AND substr(lower(trim(default_user)), 1, 1) GLOB '[a-z_]'
        AND lower(trim(default_user)) NOT GLOB '*[^a-z0-9_-]*'
        THEN lower(trim(default_user))
      ELSE 'ronak'
    END AS username,
    CASE
      WHEN json_valid(command_blacklist_json)
        AND json_type(command_blacklist_json) = 'array'
        THEN command_blacklist_json
      ELSE '[]'
    END AS blacklist,
    command_whitelist_json AS whitelist,
    whitelist_enabled,
    COALESCE(NULLIF(setup_script, ''), initial_setup_script, '') AS script
  FROM labs
)
UPDATE labs
SET recipe_json = (
  SELECT json_object(
    'version', 1,
    'entryMachine', 'box',
    'policy', json_object(
      'mode', CASE WHEN n.whitelist_enabled = 1 THEN 'whitelist' ELSE 'blacklist' END,
      'blacklist', json(n.blacklist),
      'whitelist', json(n.whitelist)
    ),
    'machines', json_array(json_object(
      'key', 'box',
      'hostname', 'box',
      'template', 'debian',
      'memoryMb', 128,
      'mainUser', n.username,
      'packages', json_array('less', 'nano', 'procps', 'iproute2', 'curl', 'ca-certificates', 'file'),
      'users', CASE
        WHEN n.username = 'root' THEN json_array()
        ELSE json_array(json_object(
          'name', n.username,
          'password', '',
          'shell', 'bash',
          'sudo', 'none',
          'sudoCommands', json_array(),
          'groups', json_array()
        ))
      END,
      'files', json_array(
        json_object(
          'path', '~/README.txt',
          'owner', n.username,
          'mode', '644',
          'content', 'Welcome to Cyber Box.' || char(10) || char(10) ||
            'Start with:' || char(10) || '  pwd' || char(10) || '  whoami' || char(10) || '  ls -la' || char(10) || char(10) ||
            'There is a small clue hidden in this directory.' || char(10)
        ),
        json_object(
          'path', '~/.first-clue',
          'owner', n.username,
          'mode', '644',
          'content', 'Clue found! A filename beginning with a dot is normally hidden.' || char(10)
        )
      ),
      'buildScript', n.script,
      'startScript', '',
      'services', json_array(),
      'allowPrivilegeEscalation', json('false'),
      'rawNetwork', json('false')
    ))
  )
  FROM normalized n
  WHERE n.id = labs.id
)
WHERE recipe_json = '{}';
