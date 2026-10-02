import Link from "next/link";
import { notFound } from "next/navigation";
import WorkspaceShell from "@/components/WorkspaceShell";
import HomeworkQuestionCard from "@/components/HomeworkQuestionCard";
import { getPaths } from "@/server/catalog";
import { requireUserId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import { isHomeworkPathUnlocked } from "@/server/homework-catalog";
import "@/app/batch-eight.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomeworkPathPage({
  params,
}: {
  params: Promise<{ pathId: string }>;
}) {
  const userId = await requireUserId();
  const { pathId } = await params;
  const path = getPaths().find((item) => item.id === pathId);

  if (!path) notFound();

  const unlocked = isHomeworkPathUnlocked(userId, path.id);
  const progress = getProgress(userId);

  return (
    <WorkspaceShell current="/homework" userId={userId}>
      <main className="b8-page">
        <Link href="/homework">← All homework</Link>
        <h1>{path.title} homework</h1>

        {!unlocked ? (
          <section className="b8-card">
            Read every chapter in this path before opening its assignments.
          </section>
        ) : (
          path.homework.map((question, index) => (
            <HomeworkQuestionCard
              key={question.homeworkId}
              question={question}
              questionNumber={index + 1}
              bestXp={progress.homeworkBest[question.homeworkId] ?? 0}
            />
          ))
        )}
      </main>
    </WorkspaceShell>
  );
}
