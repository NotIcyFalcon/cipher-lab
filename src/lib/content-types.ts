import { z } from "zod";
import type { HomeworkQuestion } from "@/lib/progress-types";

const id = z.string().min(1).max(200);
const text = z.string().max(50_000);
const points = z.number().int().min(0).max(1_000_000);

export const blockSchema = z.discriminatedUnion("type", [
  z.object({
    id,
    type: z.literal("note"),
    title: text,
    body: text,
  }),
  z.object({
    id,
    type: z.literal("tip"),
    title: text,
    body: text,
  }),
  z.object({
    id,
    type: z.literal("code"),
    title: text,
    code: text,
    caption: text,
  }),
  z.object({
    id,
    type: z.literal("lab"),
    labId: id,
    title: text,
    objective: text,
    hint: text,
    xp: points.default(50),
  }),
  z.object({
    id,
    type: z.literal("quiz"),
    question: text,
    options: z.array(z.string().max(1000)).min(2).max(10),
    answer: z.number().int().min(0).max(9),
    explanation: text,
  }),
]);

export const blocksSchema = z.array(blockSchema).max(100).superRefine(
  (blocks, context) => {
    const ids = new Set<string>();

    blocks.forEach((block, index) => {
      if (ids.has(block.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "id"],
          message: "Duplicate block ID.",
        });
      }

      ids.add(block.id);

      if (block.type === "quiz" && block.answer >= block.options.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "answer"],
          message: "Answer must reference an option.",
        });
      }
    });
  },
);

export const objectivesSchema = z.array(
  z.string().min(1).max(2000),
).max(100);

export type ContentBlock = z.infer<typeof blockSchema>;

export type Lesson = {
  id: string;
  pathId: string;
  title: string;
  description: string;
  category: string;
  minutes: number;
  xp: number;
  objectives: string[];
  blocks: ContentBlock[];
};

export type LearningPath = {
  id: string;
  topicId: string;
  topicName: string;
  title: string;
  difficulty: string;
  timeDays: number;
  type: "Hands-on" | "Reading";
  lessonIds: string[];
  lessons: Lesson[];
  homework: HomeworkQuestion[];
};
