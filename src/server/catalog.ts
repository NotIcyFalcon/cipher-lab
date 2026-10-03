import "server-only";

import {
  blocksSchema,
  objectivesSchema,
  type LearningPath,
  type Lesson,
} from "@/lib/content-types";
import type { HomeworkQuestion } from "@/lib/progress-types";
import { getDb } from "@/server/db";

type ChapterRow = {
  id: string;
  path_id: string;
  title: string;
  description: string | null;
  content_json: string;
  reading_points: number;
  reading_minutes: number;
  objectives: string;
  topic_name: string;
};

type PathRow = {
  id: string;
  topic_id: string;
  topic_name: string;
  title: string;
  difficulty: string | null;
  time_days: number | null;
};

export function getLessons(): Lesson[] {
  const rows = getDb().prepare(`
    SELECT
      c.id, c.path_id, c.title, c.description, c.content_json,
      c.reading_points, c.reading_minutes, c.objectives,
      t.name AS topic_name
    FROM chapters c
    JOIN learning_paths p ON p.id = c.path_id
    JOIN topics t ON t.id = p.topic_id
    ORDER BY p.id, c.sequence_order, c.id
  `).all() as ChapterRow[];

  return rows.map((row) => {
    if (!Number.isSafeInteger(row.reading_points) || row.reading_points < 0) {
      throw new Error(`Invalid reading XP for chapter ${row.id}`);
    }

    return {
      id: row.id,
      pathId: row.path_id,
      title: row.title,
      description: row.description ?? "",
      category: row.topic_name,
      minutes: row.reading_minutes,
      xp: row.reading_points,
      objectives: objectivesSchema.parse(JSON.parse(row.objectives)),
      // Explicit schema strips unknown fields before anything reaches React.
      blocks: blocksSchema.parse(JSON.parse(row.content_json)),
    };
  });
}

export function getPublicHomework(pathId: string): HomeworkQuestion[] {
  return getDb().prepare(`
    SELECT
      h.id AS homeworkId,
      hq.id AS questionId,
      hq.title,
      hq.question_markdown AS objective,
      0 AS baseXp,
      COALESCE(SUM(t.xp_reward), 0) AS testXp,
      COALESCE(SUM(t.xp_reward), 0) AS totalPoints,
      COUNT(t.id) AS totalTests
    FROM homework h
    JOIN homework_questions hq ON h.id = hq.homework_id
    LEFT JOIN homework_test_cases t ON t.question_id = hq.id
    WHERE h.path_id = ?
    GROUP BY h.id, hq.id
    ORDER BY h.title, h.id, hq.sequence_order
  `).all(pathId) as HomeworkQuestion[];
}

export function getPaths(): LearningPath[] {
  const paths = getDb().prepare(`
    SELECT
      p.id, p.topic_id, p.title, p.difficulty, p.time_days,
      t.name AS topic_name
    FROM learning_paths p
    JOIN topics t ON t.id = p.topic_id
    ORDER BY t.name, p.title, p.id
  `).all() as PathRow[];

  const lessons = getLessons();

  return paths.map((path) => {
    const chapters = lessons.filter((lesson) => lesson.pathId === path.id);

    return {
      id: path.id,
      topicId: path.topic_id,
      topicName: path.topic_name,
      title: path.title,
      difficulty: path.difficulty ?? "",
      timeDays: path.time_days ?? 0,
      type: chapters.some((chapter) =>
        chapter.blocks.some((block) => block.type === "lab"),
      ) ? "Hands-on" : "Reading",
      lessonIds: chapters.map((chapter) => chapter.id),
      lessons: chapters,
      homework: getPublicHomework(path.id),
    };
  });
}
