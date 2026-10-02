import Link from "next/link";
import WorkspaceShell from "@/components/WorkspaceShell";
import { getPaths } from "@/server/catalog";
import { requireUserId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import { isHomeworkPathUnlocked } from "@/server/homework-catalog";
import "@/app/batch-eight.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomeworkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await requireUserId();
  const query = await searchParams;
  const progress = getProgress(userId);

  const paths = getPaths().filter(
    (path) => typeof query.path !== "string" || path.id === query.path,
  );

  return (
    <WorkspaceShell current="/homework" userId={userId}>
      <main className="b8-page">
        <h1>Homework</h1>
        <p className="b8-muted">
          Read every chapter in a learning path to unlock its homework.
          Each passing test earns its own XP. Base XP is awarded only when
          every test passes.
        </p>

        {paths.map((path) => {
          const unlocked = isHomeworkPathUnlocked(userId, path.id);

          const available = path.homework.reduce(
            (sum, question) => sum + question.totalPoints,
            0,
          );

          const earned = path.homework.reduce(
            (sum, question) => sum + Math.min(
              question.totalPoints,
              progress.homeworkBest[question.homeworkId] ?? 0,
            ),
            0,
          );

          return (
            <section className="b8-card" key={path.id}>
              <small>{path.topicName}</small>
              <h2>{path.title}</h2>
              <p>
                {path.homework.length} assignments · {earned}/{available} XP
              </p>

              {path.homework.length === 0 ? (
                <p>No homework has been added yet.</p>
              ) : unlocked ? (
                <Link
                  className="primary-button"
                  href={`/homework/${encodeURIComponent(path.id)}`}
                >
                  Open homework
                </Link>
              ) : (
                <p>Locked — complete all {path.lessons.length} chapters.</p>
              )}
            </section>
          );
        })}
      </main>
    </WorkspaceShell>
  );
}
