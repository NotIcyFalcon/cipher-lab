import { notFound } from "next/navigation";
import LearningPage from "@/components/LearningPage";
import { lessons, type ContentBlock } from "@/content/lessons";
import { paths } from "@/content/paths";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type ReadingBlock = Exclude<ContentBlock, { type: "homework" }>;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const userId = await requireRonakId();
  const query = await searchParams;

  const requestedPath =
    typeof query.path === "string" ? query.path : undefined;
  const selectedPath = requestedPath
    ? paths.find((path) => path.id === requestedPath)
    : paths[0];

  if (!selectedPath) notFound();

  const readingLessons = selectedPath.lessonIds.map((id) => {
    const lesson = lessons.find((item) => item.id === id);
    if (!lesson) {
      throw new Error(`Path references an unknown lesson: ${id}`);
    }
    return {
      ...lesson,
      blocks: lesson.blocks.filter(
        (block): block is ReadingBlock => block.type !== "homework",
      ),
    };
  });

  if (readingLessons.length === 0) notFound();

  const progress = getProgress(userId);
  const revision = query.revise === "1";

  const initialLessonId = revision
    ? readingLessons[0].id
    : (
        readingLessons.find(
          (lesson) => !progress.readingIds.includes(lesson.id),
        ) ?? readingLessons[0]
      ).id;

  return (
    <LearningPage
      key={`${selectedPath.id}:${revision ? "revision" : "learning"}`}
      lessons={readingLessons}
      progress={progress}
      initialLessonId={initialLessonId}
      revision={revision}
      pathTitle={selectedPath.title}
      userId={userId}
    />
  );
}
