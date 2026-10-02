import { notFound } from "next/navigation";
import LearningPage from "@/components/LearningPage";
import { getPaths } from "@/server/catalog";
import { requireUserId } from "@/server/current-user";
import { getProgress } from "@/server/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const userId = await requireUserId();
  const query = await searchParams;
  const paths = getPaths();

  const path = typeof query.path === "string"
    ? paths.find((item) => item.id === query.path)
    : paths[0];

  if (!path || path.lessons.length === 0) notFound();

  const progress = getProgress(userId);
  const revision = query.revise === "1";

  const initialLessonId = revision
    ? path.lessons[0].id
    : (
      path.lessons.find(
        (lesson) => !progress.readingIds.includes(lesson.id),
      ) ?? path.lessons[0]
    ).id;

  return (
    <LearningPage
      key={`${path.id}:${revision ? "revision" : "learning"}`}
      lessons={path.lessons}
      progress={progress}
      initialLessonId={initialLessonId}
      revision={revision}
      pathTitle={path.title}
      userId={userId}
    />
  );
}
