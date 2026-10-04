import type { LabRecipe } from "@/lib/lab-recipe";
import type { CompareOptions, HomeworkEnvironment } from "@/lib/homework-recipe";

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
  description: string;
  recipe_json: string;
  build_status: "draft" | "queued" | "building" | "ready" | "failed";
  current_build_id: number | null;
  built_recipe_hash: string | null;
  // Latest build (joined in the page query); null when never built.
  last_build_status: "queued" | "building" | "succeeded" | "failed" | null;
  last_build_error: string | null;
  last_build_log: string | null;
};

export type HomeworkRow = {
  id: string;
  path_id: string;
  title: string;
  total_base_xp: number;
  environment_json: string;
  prep_status: "draft" | "queued" | "preparing" | "ready" | "failed";
  prep_error: string | null;
  prep_log: string;
  definition_hash: string | null;
  prepared_hash: string | null;
  prepared_at: number | null;
};

export type QuestionRow = {
  id: string;
  homework_id: string;
  title: string;
  question_markdown: string;
  standard_solution_script: string | null;
  time_limit_sec: number;
  compare_json: string;
  sequence_order: number;
};

export type TestCaseRow = {
  id: string;
  homework_id: string;
  question_id: string | null;
  setup_script: string | null;
  args: string;
  stdin: string;
  xp_reward: number;
  is_hidden: number;
  sequence_order: number;
  // Preview of the reference solution's results (from expected_json).
  expected_stdout: string | null;
  expected_exit: number | null;
  expected_files: number | null;
  expected_ms: number | null;
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
  questions: QuestionRow[];
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
      completionAnswer?: string;
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
  args: string;
  stdin: string;
  xp_reward: number;
  is_hidden: boolean;
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

export type QuestionDraft = {
  id: string;
  title: string;
  question_markdown: string;
  standard_solution_script: string;
  time_limit_sec: number;
  compare: CompareOptions;
  tests: TestDraft[];
};

export type HomeworkDraft = {
  entity: "homework";
  id: string;
  path_id: string;
  title: string;
  total_base_xp: number;
  environment: HomeworkEnvironment;
  questions: QuestionDraft[];
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
  flag: string;
  hints: HintDraft[];
};

export type LabDraft = {
  entity: "labs";
  id: string;
  name: string;
  description: string;
  recipe: LabRecipe;
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
