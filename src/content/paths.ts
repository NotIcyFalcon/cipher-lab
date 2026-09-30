import { lessons } from "@/content/lessons";

export const paths = [...new Set(lessons.map((lesson) => lesson.category))]
  .map((category) => {
    const items = lessons.filter((lesson) => lesson.category === category);

    return {
      id: category,
      title: category,
      difficulty: "Beginner",
      type: items.some((lesson) =>
        lesson.blocks.some((block) => block.type === "lab"),
      )
        ? "Hands-on"
        : "Reading",
      lessonIds: items.map((lesson) => lesson.id),
    };
  });

export function pathHref(id: string) {
  return `/paths/${encodeURIComponent(id)}`;
}
