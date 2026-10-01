import "server-only";

import { lessons, type ContentBlock } from "@/content/lessons";
import type { HomeworkQuestion } from "@/lib/progress-types";

type HomeworkBlock = Extract<ContentBlock, { type: "homework" }>;

export type HomeworkDefinition = HomeworkBlock & {
  chapterId: string;
};

export const homeworkChapters = lessons
  .map((lesson) => {
    const questions = lesson.blocks
      .filter((block): block is HomeworkBlock => block.type === "homework")
      .map((block) => ({
        ...block,
        totalTests: block.testCases.length,
      }));

    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      questions,
    };
  })
  .filter((chapter) => chapter.questions.length > 0);

const questionsById = new Map<string, HomeworkDefinition>();
const homeworkChapterIds = new Set(
  homeworkChapters.map((chapter) => chapter.id),
);

for (const chapter of homeworkChapters) {
  for (const question of chapter.questions) {
    if (questionsById.has(question.homeworkId)) {
      throw new Error(`Duplicate homeworkId: ${question.homeworkId}`);
    }

    if (
      !Number.isInteger(question.totalPoints) ||
      question.totalPoints <= 0 ||
      question.testCases.length === 0 ||
      question.testCases.length > 100
    ) {
      throw new Error(`Invalid homework definition: ${question.homeworkId}`);
    }

    questionsById.set(question.homeworkId, {
      ...question,
      chapterId: chapter.id,
    });
  }
}

/**
 * Reading completion is the only homework unlock requirement.
 * Lab completion and homework scores do not unlock a chapter.
 *
 * Pass reading IDs obtained from server-side account progress, never
 * reading IDs supplied by a client.
 */
export function canAccessHomeworkChapter(
  chapterId: string,
  readingIds: readonly string[],
): boolean {
  return (
    homeworkChapterIds.has(chapterId) &&
    readingIds.includes(chapterId)
  );
}

/**
 * Useful for enforcing the same rule in grading and history actions.
 * Unknown homework IDs fail closed.
 */
export function canAccessHomework(
  homeworkId: string,
  readingIds: readonly string[],
): boolean {
  const question = questionsById.get(homeworkId);

  return (
    question !== undefined &&
    canAccessHomeworkChapter(question.chapterId, readingIds)
  );
}

export function findHomework(homeworkId: string) {
  return questionsById.get(homeworkId);
}

/**
 * Only this public projection should be sent to the client.
 * Grading commands and expected test outputs remain server-side.
 */
export function publicQuestion(question: HomeworkBlock): HomeworkQuestion {
  return {
    homeworkId: question.homeworkId,
    title: question.title || "Assignment",
    objective: question.objective || "Complete the assignment script.",
    totalPoints: question.totalPoints,
    totalTests: question.testCases.length,
  };
}
