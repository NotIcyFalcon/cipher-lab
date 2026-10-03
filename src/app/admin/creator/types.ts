export const creatorSections = [
  "topics",
  "paths",
  "homework",
  "ctfs",
  "universes",
  "ctf",
  "labs",
] as const;

export type CreatorSection = (typeof creatorSections)[number];

export type TopicType = "path" | "homework" | "ctf";

export type TopicRow = {
  id: string;
  name: string;
  description: string | null;
  type: TopicType;
};

export type PathRow = {
  id: string;
  topic_id: string;
  title: string;
  difficulty: string | null;
  time_days: number | null;
};

export type ChapterRow = {
  id: string;
  path_id: string;
  title: string;
  description: string | null;
  content_json: string;
  objectives_json: string;
  reading_points: number;
  sequence_order: number;
};

export type LabRow = {
  id: string;
  name: string;
  base_image: string;
  snapshot_image: string | null;
  default_user: string;
  whitelist_enabled: number;
  command_blacklist_json: string | null;
  command_whitelist_json: string | null;
  setup_script: string | null;
  completion_code_hash: string | null;
};

export type HomeworkRow = {
  id: string;
  path_id: string;
  title: string;
  question_markdown: string;
  setup_script: string | null;
  standard_solution_script: string | null;
  total_base_xp: number;
};

export type TestCaseRow = {
  id: string;
  homework_id: string;
  setup_script: string | null;
  xp_reward: number;
  is_hidden: number;
  expected_output: string | null;
  expected_folder: string | null;
};

export type CtfRow = {
  id: string;
  topic_id: string;
  name: string;
  description: string | null;
  difficulty: string | null;
  suggested_paths_json: string;
  sequence_order: number;
};

export type CtfUniverseRow = {
  id: string;
  ctf_id: string;
  name: string;
  description: string | null;
  sequence_order: number;
};

export type CtfChallengeRow = {
  id: string;
  universe_id: string;
  title: string;
  description: string | null;
  points: number;
  difficulty: string | null;
  lab_id: string | null;
  flag_hash: string | null;
  suggested_paths_json: string;
};

export type HintRow = {
  id: string;
  challenge_id: string;
  text: string;
  penalty: number;
  sequence_order: number;
};

export type CreatorData = {
  topics: TopicRow[];
  paths: PathRow[];
  chapters: ChapterRow[];
  labs: LabRow[];
  homework: HomeworkRow[];
  tests: TestCaseRow[];
  ctfs: CtfRow[];
  universes: CtfUniverseRow[];
  challenges: CtfChallengeRow[];
  hints: HintRow[];
};

export type EditorBlock =
  | {
      id: string;
      type: "note" | "tip";
      title: string;
      body: string;
    }
  | {
      id: string;
      type: "code";
      title: string;
      code: string;
      caption: string;
    }
  | {
      id: string;
      type: "quiz";
      question: string;
      options: string[];
      answer: number;
      explanation: string;
    }
  | {
      id: string;
      type: "lab";
      labId: string;
      title: string;
      objective: string;
      hint: string;
      points: number;
      completionCodeHash?: string;
    };

export type ChapterDraft = {
  id: string;
  title: string;
  description: string;
  reading_points: number;
  blocks: EditorBlock[];
  objectives: string[];
};

export type TestDraft = {
  id: string;
  setup_script: string;
  xp_reward: number;
  is_hidden: boolean;
  expected_output?: string | null;
  expected_folder?: string | null;
};

export type HintDraft = {
  id: string;
  text: string;
  penalty: number;
};

export type TopicDraft = {
  entity: "topics";
  id: string;
  name: string;
  description: string;
  type: TopicType;
};

export type PathDraft = {
  entity: "paths";
  id: string;
  topic_id: string;
  title: string;
  difficulty: string;
  time_days: number;
  chapters: ChapterDraft[];
};

export type HomeworkDraft = {
  entity: "homework";
  id: string;
  path_id: string;
  title: string;
  question_markdown: string;
  setup_script: string;
  total_base_xp: number;
  standard_solution_script: string;
  tests: TestDraft[];
};

export type CtfDefinitionDraft = {
  entity: "ctfs";
  id: string;
  topic_id: string;
  name: string;
  description: string;
  difficulty: string;
  suggested_path_ids: string[];
};

export type CtfUniverseDraft = {
  entity: "universes";
  id: string;
  ctf_id: string;
  name: string;
  description: string;
};

export type CtfDraft = {
  entity: "ctf";
  id: string;
  universe_id: string;
  title: string;
  description: string;
  points: number;
  difficulty: string;
  lab_id: string;
  flag_hash: string;
  suggested_path_ids: string[];
  hints: HintDraft[];
};

export type LabDraft = {
  entity: "labs";
  id: string;
  name: string;
  default_user: string;
  whitelist_enabled: boolean;
  command_blacklist: string;
  command_whitelist: string;
  setup_script: string;
  completion_code_hash: string;
};

export type CreatorDraft =
  | TopicDraft
  | PathDraft
  | HomeworkDraft
  | CtfDefinitionDraft
  | CtfUniverseDraft
  | CtfDraft
  | LabDraft;

export type ActionState = {
  error?: string;
};
