import Link from "next/link";
import { pathHref } from "@/lib/path-links";
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
    (path) =>
      path.homework.length > 0 &&
      (typeof query.path !== "string" || path.id === query.path),
  );

  const groups = new Map<string, typeof paths>();

  for (const path of paths) {
    const group = groups.get(path.topicId) ?? [];
    group.push(path);
    groups.set(path.topicId, group);
  }

  // WorkspaceShell belongs to homework/layout.tsx.
  // Do not nest another <main> inside WorkspaceShell's <main> unless necessary, but we will use a div.
  return (
    <div className="b8-page">
      <h1>Homework</h1>

      <p className="b8-muted">
        Read every chapter in a learning path to unlock its homework.
        Each passing test earns its own XP. Base XP is awarded only
        when every test passes.
      </p>

      {paths.length === 0 ? (
        <section className="b8-card">
          <h2>No homework yet</h2>
          <p>
            Assignments appear here after they have been created.
          </p>
        </section>
      ) : (
        Array.from(groups.entries()).map(([topicId, categoryPaths]) => (
          <section key={topicId}>
            <h2>{categoryPaths[0].topicName}</h2>

            {categoryPaths.map((path) => {
              const unlocked = isHomeworkPathUnlocked(userId, path.id);

              const available = path.homework.reduce(
                (sum, question) => sum + question.totalPoints,
                0,
              );

              const earned = path.homework.reduce(
                (sum, question) =>
                  sum +
                  Math.min(
                    question.totalPoints,
                    Math.max(
                      0,
                      progress.homeworkBest[question.homeworkId] ?? 0,
                    ),
                  ),
                0,
              );

              return (
                <article className="b8-card" key={path.id}>
                  <small>{path.topicName}</small>
                  <h3>{path.title}</h3>

                  <p>
                    {path.homework.length} assignments · {earned}/{available} XP
                  </p>

                  {unlocked ? (
                    <>
                      <p>Unlocked</p>
                      <Link
                        className="primary-button"
                        href={`/homework/${encodeURIComponent(path.id)}`}
                      >
                        Open homework
                      </Link>
                    </>
                  ) : (
                    <>
                      <p>Locked</p>
                      <Link
                        className="secondary-button"
                        href={pathHref(path.id)}
                      >
                        Read {path.title} to unlock
                      </Link>
                    </>
                  )}
                </article>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
