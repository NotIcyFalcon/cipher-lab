import LearningPage from "@/components/LearningPage";
import { lessons } from "@/content/lessons";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page() {
  const userId = await requireRonakId();

  const readingLessons = lessons.map((lesson) => ({
    ...lesson,
    blocks: lesson.blocks.filter((block) => block.type !== "homework"),
  }));

  return (
    <LearningPage
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lessons={readingLessons as any}
      progress={getProgress(userId)}
    />
  );
}
