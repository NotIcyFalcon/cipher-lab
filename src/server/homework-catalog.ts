import "server-only";
import { lessons, type ContentBlock } from "@/content/lessons";
import type { HomeworkQuestion } from "@/lib/progress-types";

type HomeworkBlock = Extract<ContentBlock, { type: "homework" }>;

export type HomeworkDefinition = HomeworkBlock & {
  chapterId: string;
};

export const homeworkChapters = lessons.map((lesson) => ({
  id: lesson.id,
  title: lesson.title,
  description: lesson.description,
  questions: lesson.blocks.filter(
    (block): block is HomeworkBlock => block.type === "homework",
  ),
}));

const questionsById = new Map<string, HomeworkDefinition>();

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

export function findHomework(homeworkId: string) {
  return questionsById.get(homeworkId);
}

export function publicQuestion(
  question: HomeworkBlock,
): HomeworkQuestion {
  return {
    homeworkId: question.homeworkId,
    title: question.title || "Assignment",
    objective: question.objective || "Complete the assignment script.",
    totalPoints: question.totalPoints,
    totalTests: question.testCases.length,
  };
}
