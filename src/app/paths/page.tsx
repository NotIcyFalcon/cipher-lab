import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  FileCode2,
  FolderOpen,
  Layers3,
  Terminal,
  Trophy,
} from "lucide-react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { pathHref, pathRevisionHref } from "@/lib/path-links";
import type { LearningPath } from "@/lib/content-types";
import { getPaths } from "@/server/catalog";
import {
  formatLessonDuration,
  getPathProgress,
} from "@/lib/path-progress";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import "@/app/batch-two.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PathEntry = {
  path: LearningPath;
  stats: ReturnType<typeof getPathProgress>;
};

export default async function PathsPage() {
  const userId = await requireRonakId();
  const progress = getProgress(userId);

  const paths = getPaths();

  const entries: PathEntry[] = paths.map((path) => ({
    path,
    stats: getPathProgress(path, progress),
  }));

  // Paths currently derive from lesson categories. Do not invent categories
  // or courses that are not present in the content.
  const groups = new Map<string, PathEntry[]>();
  for (const entry of entries) {
    const category = entry.stats.lessons[0]?.category ?? entry.path.title;
    const group = groups.get(category) ?? [];
    group.push(entry);
    groups.set(category, group);
  }

  const totalLessons = entries.reduce(
    (sum, entry) => sum + entry.stats.lessonCount,
    0,
  );
  const totalEarned = entries.reduce(
    (sum, entry) => sum + entry.stats.earned,
    0,
  );
  const totalAvailable = entries.reduce(
    (sum, entry) => sum + entry.stats.available,
    0,
  );

  return (
    <WorkspaceShell current="/paths" userId={userId}>
      <div className="paths-page">
        <header className="paths-heading">
          <div>
            <span className="dashboard-kicker">YOUR LEARNING LIBRARY</span>
            <h1>Learning Paths</h1>
          </div>
          <span className="paths-heading-icon" aria-hidden="true">
            <Layers3 size={34} />
          </span>
        </header>

        <dl className="paths-summary">
          <div>
            <dt>
              <FolderOpen size={16} aria-hidden="true" />
              Learning paths
            </dt>
            <dd>{paths.length}</dd>
          </div>
          <div>
            <dt>
              <BookOpen size={16} aria-hidden="true" />
              Chapters to explore
            </dt>
            <dd>{totalLessons}</dd>
          </div>
          <div>
            <dt>
              <Trophy size={16} aria-hidden="true" />
              Your path points
            </dt>
            <dd>
              {totalEarned} <span>/ {totalAvailable}</span>
            </dd>
          </div>
        </dl>

        {groups.size > 0 ? (
          Array.from(groups.entries()).map(([category, categoryPaths], index) => (
            <section
              key={category}
              className="paths-category"
              aria-labelledby={`path-category-${index}`}
            >
              <div className="dashboard-section-heading">
                <div>
                  <span className="dashboard-kicker">EXPLORE A CATEGORY</span>
                  <h2 id={`path-category-${index}`}>{category}</h2>
                </div>
                <span className="paths-category-count">
                  {categoryPaths.length}{" "}
                  {categoryPaths.length === 1 ? "path" : "paths"}
                </span>
              </div>

              <ul className="paths-catalog">
                {categoryPaths.map(({ path, stats }) => {
                  const allPointsEarned =
                    stats.available > 0 && stats.earned >= stats.available;
                  const fullCompletion = stats.readingComplete && allPointsEarned;

                  const stateLabel = fullCompletion
                    ? "Complete"
                    : stats.readingComplete
                      ? "Reading complete"
                      : stats.started
                        ? "In progress"
                        : "Ready to start";

                  const actionLabel = fullCompletion
                    ? "Revisit path"
                    : stats.readingComplete
                      ? "Continue practice"
                      : stats.started
                        ? "Continue path"
                        : "Start path";

                  return (
                    <li key={path.id}>
                      <article className="paths-course-card">
                        <div className="paths-course-top">
                          <span
                            className="dashboard-path-icon"
                            aria-hidden="true"
                          >
                            {stats.labCount > 0 ? (
                              <Terminal size={23} />
                            ) : (
                              <BookOpen size={23} />
                            )}
                          </span>
                          <span
                            className={`dashboard-state${
                              fullCompletion ? " is-complete" : ""
                            }`}
                          >
                            {fullCompletion && (
                              <Check size={12} aria-hidden="true" />
                            )}
                            {stateLabel}
                          </span>
                        </div>

                        <div className="paths-course-body">
                          <span className="dashboard-kicker">LEARNING PATH</span>
                          <h3>
                            <Link href={pathHref(path.id)}>{path.title}</Link>
                          </h3>
                          <p>
                            {stats.lessonCount}{" "}
                            {stats.lessonCount === 1 ? "chapter" : "chapters"}
                          </p>

                          <div className="paths-course-tags">
                            <span>{path.difficulty}</span>
                            <span>{path.type}</span>
                            <span>
                              <Clock3 size={12} aria-hidden="true" />
                              {formatLessonDuration(stats.minutes)} reading
                            </span>
                          </div>


                          <dl
                            className="paths-points-breakdown"
                            aria-label={`${path.title} points breakdown`}
                          >
                            <div>
                              <dt>
                                <BookOpen size={14} aria-hidden="true" />
                                Reading
                              </dt>
                              <dd>
                                {stats.readingEarned}{" "}
                                <span> / {stats.readingAvailable}</span>
                              </dd>
                            </div>
                            <div>
                              <dt>
                                <Terminal size={14} aria-hidden="true" />
                                Labs
                              </dt>
                              <dd>
                                {stats.labsEarned}{" "}
                                <span> / {stats.labsAvailable}</span>
                              </dd>
                            </div>
                            <div>
                              <dt>
                                <FileCode2 size={14} aria-hidden="true" />
                                Homework
                              </dt>
                              <dd>
                                {stats.homeworkEarned}{" "}
                                <span> / {stats.homeworkAvailable}</span>
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="paths-course-progress">
                          <div>
                            <span>Total path points</span>
                            <strong>
                              {stats.earned} <span> / {stats.available}</span>
                            </strong>
                          </div>
                          <progress
                            value={stats.earned}
                            max={stats.available || 1}
                            aria-label={`${path.title}: ${stats.earned} of ${stats.available} points earned`}
                          />
                          <p>
                            {stats.percentage}% of points earned ·{" "}
                            {stats.readingCount}/{stats.lessonCount} chapters read
                            · {stats.completedLabCount}/{stats.labCount} labs
                            completed
                          </p>
                        </div>

                        <footer className="paths-course-footer">
                          <Link
                            href={pathHref(path.id)}
                            className="primary-button"
                            aria-label={`${actionLabel}: ${path.title}`}
                          >
                            {actionLabel}
                            <ArrowRight size={15} aria-hidden="true" />
                          </Link>
                          {stats.readingComplete && (
                            <Link
                              href={pathRevisionHref(path.id)}
                              className="dashboard-text-link"
                              aria-label={`Review reading: ${path.title}`}
                            >
                              Review reading
                            </Link>
                          )}
                        </footer>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        ) : (
          <section className="dashboard-empty">
            <FolderOpen size={30} aria-hidden="true" />
            <h2>No learning paths yet.</h2>
          </section>
        )}
      </div>
    </WorkspaceShell>
  );
}
