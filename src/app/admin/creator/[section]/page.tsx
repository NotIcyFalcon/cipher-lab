import { notFound } from "next/navigation";
import { requireUserId } from "@/server/current-user";
import { getDb } from "@/server/db";
import CreatorClient from "../CreatorClient";
import {
  creatorSections,
  type CreatorSection,
  type CreatorData,
  type TopicRow,
  type PathRow,
  type ChapterRow,
  type LabRow,
  type HomeworkRow,
  type QuestionRow,
  type TestCaseRow,
  type CtfRow,
  type CtfUniverseRow,
  type CtfChallengeRow,
  type HintRow,
} from "../types";

type Search = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function CreatorSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Search>;
}) {
  const user = await requireUserId();

  if (user !== "admin") {
    return null;
  }

  const { section: rawSection } = await params;

  if (!creatorSections.includes(rawSection as CreatorSection)) {
    notFound();
  }

  const section = rawSection as CreatorSection;
  const search = await searchParams;
  const db = getDb();

  const data: CreatorData = {
    topics: db
      .prepare("SELECT * FROM topics ORDER BY type, name COLLATE NOCASE")
      .all() as TopicRow[],

    paths: db
      .prepare("SELECT * FROM learning_paths ORDER BY title COLLATE NOCASE")
      .all() as PathRow[],

    chapters: db
      .prepare("SELECT * FROM chapters ORDER BY path_id, sequence_order, id")
      .all() as ChapterRow[],

    labs: db
      .prepare(`
        SELECT
          l.id, l.name, l.description, l.recipe_json, l.build_status,
          l.current_build_id, l.built_recipe_hash,
          b.status AS last_build_status,
          b.error AS last_build_error,
          substr(b.log, -6000) AS last_build_log
        FROM labs l
        LEFT JOIN lab_builds b
          ON b.id = (SELECT id FROM lab_builds WHERE lab_id = l.id ORDER BY id DESC LIMIT 1)
        ORDER BY l.name COLLATE NOCASE, l.id
      `)
      .all() as LabRow[],

    homework: db
      .prepare("SELECT * FROM homework ORDER BY path_id, id")
      .all() as HomeworkRow[],

    tests: db
      .prepare("SELECT * FROM homework_test_cases ORDER BY homework_id, id")
      .all() as TestCaseRow[],

    questions: db
      .prepare("SELECT * FROM homework_questions ORDER BY homework_id, sequence_order, id")
      .all() as QuestionRow[],

    challenges: db
      .prepare("SELECT * FROM ctf_challenges ORDER BY sequence_order, id")
      .all() as CtfChallengeRow[],

    ctfs: db
      .prepare("SELECT * FROM ctfs ORDER BY sequence_order, id")
      .all() as CtfRow[],

    universes: db
      .prepare("SELECT * FROM ctf_universes ORDER BY sequence_order, id")
      .all() as CtfUniverseRow[],

    hints: db
      .prepare("SELECT * FROM ctf_hints ORDER BY challenge_id, sequence_order, id")
      .all() as HintRow[],
  };

  const editId = single(search.edit);

  const records = {
    topics: data.topics,
    paths: data.paths,
    homework: data.homework,
    ctfs: data.ctfs,
    universes: data.universes,
    ctf: data.challenges,
    labs: data.labs,
  }[section];

  if (editId && !records.some((record) => record.id === editId)) {
    notFound();
  }

  return (
    <CreatorClient
      key={[
        section,
        editId,
        single(search.new),
        single(search.pathId),
        single(search.topicId),
        single(search.ctfId),
        single(search.universeId),
        single(search.saved),
        single(search.deleted),
      ].join(":")}
      section={section}
      data={data}
      editId={editId}
      creating={single(search.new) === "1"}
      pathId={single(search.pathId)}
      topicId={single(search.topicId)}
      ctfId={single(search.ctfId)}
      universeId={single(search.universeId)}
      saved={single(search.saved) === "1"}
      deleted={single(search.deleted) === "1"}
    />
  );
}
