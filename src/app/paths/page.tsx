import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  FolderOpen,
  Layers3,
  Terminal,
  Trophy,
} from "lucide-react";
import WorkspaceShell from "@/components/WorkspaceShell";
import CatalogFilter from "@/components/ui/CatalogFilter";
import { pathHref, pathRevisionHref } from "@/lib/path-links";
import type { LearningPath } from "@/lib/content-types";
import { getPaths } from "@/server/catalog";
import { getPathProgress } from "@/lib/path-progress";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import "@/styles/pages/catalog.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PathEntry = {
  path: LearningPath;
  stats: ReturnType<typeof getPathProgress>;
};

type TopicGroup = {
  id: string;
  name: string;
  entries: PathEntry[];
};

function pathState(stats: PathEntry["stats"]) {
  const complete = stats.readingComplete && stats.available > 0 && stats.earned >= stats.available;
  if (complete) return { key: "complete", label: "Complete", action: "Revisit" } as const;
  if (stats.readingComplete) return { key: "practice", label: "Reading done", action: "Practice" } as const;
  if (stats.started) return { key: "progress", label: "In progress", action: "Continue" } as const;
  return { key: "new", label: "Not started", action: "Start" } as const;
}

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export default async function PathsPage() {
  const userId = await requireRonakId();
  const progress = getProgress(userId);

  const entries: PathEntry[] = getPaths().map((path) => ({
    path,
    stats: getPathProgress(path, progress),
  }));

  const topics = new Map<string, TopicGroup>();
  for (const entry of entries) {
    const topic = topics.get(entry.path.topicId) ?? {
      id: entry.path.topicId,
      name: entry.path.topicName,
      entries: [],
    };
    topic.entries.push(entry);
    topics.set(entry.path.topicId, topic);
  }
  const groups = [...topics.values()];

  const totals = entries.reduce(
    (sum, { stats }) => ({
      lessons: sum.lessons + stats.lessonCount,
      earned: sum.earned + stats.earned,
      available: sum.available + stats.available,
      complete: sum.complete + (pathState(stats).key === "complete" ? 1 : 0),
    }),
    { lessons: 0, earned: 0, available: 0, complete: 0 },
  );

  // Open the topics you are working in; otherwise just the first one.
  const activeTopics = new Set(
    groups
      .filter((group) => group.entries.some(({ stats }) => ["progress", "practice"].includes(pathState(stats).key)))
      .map((group) => group.id),
  );
  if (activeTopics.size === 0 && groups[0]) activeTopics.add(groups[0].id);

  return (
    <WorkspaceShell current="/paths" userId={userId}>
      <header className="ui-page-head">
        <span className="ui-eyebrow">Learning library</span>
        <div className="ui-page-head-row">
          <div>
            <h1 className="ui-title">
              Learning <em>paths</em>
            </h1>
            <p className="ui-lede">
              Guided chapters with hands-on labs and homework. Each path shows the days it usually takes.
            </p>
          </div>
        </div>
        <dl className="ui-stats" aria-label="Library overview">
          <div>
            <dt>
              <FolderOpen size={14} aria-hidden="true" />
              Paths
            </dt>
            <dd>{entries.length}</dd>
          </div>
          <div>
            <dt>
              <BookOpen size={14} aria-hidden="true" />
              Chapters
            </dt>
            <dd>{totals.lessons}</dd>
          </div>
          <div>
            <dt>
              <Check size={14} aria-hidden="true" />
              Completed
            </dt>
            <dd>
              {totals.complete} <span>/ {entries.length}</span>
            </dd>
          </div>
          <div>
            <dt>
              <Trophy size={14} aria-hidden="true" />
              Points
            </dt>
            <dd>
              {totals.earned} <span>/ {totals.available}</span>
            </dd>
          </div>
        </dl>
      </header>

      {groups.length === 0 ? (
        <section className="ui-empty">
          <Layers3 size={28} aria-hidden="true" />
          <h2>No learning paths yet</h2>
          <p>Paths appear here once they are published in Creator.</p>
        </section>
      ) : (
        <CatalogFilter
          label="Filter learning paths"
          placeholder="Search paths"
          categories={groups.map((group) => ({ id: group.id, label: group.name, count: group.entries.length }))}
        >
          <div className="ui-accordion">
            {groups.map((group) => {
              const complete = group.entries.filter(({ stats }) => pathState(stats).key === "complete").length;
              const earned = group.entries.reduce((sum, { stats }) => sum + stats.earned, 0);
              const available = group.entries.reduce((sum, { stats }) => sum + stats.available, 0);

              return (
                <details
                  key={group.id}
                  className="ui-acc"
                  open={activeTopics.has(group.id)}
                  data-filter-group
                >
                  <summary>
                    <span className="ui-acc-title">
                      <h2>{group.name}</h2>
                      <span className="ui-label">{plural(group.entries.length, "path")}</span>
                    </span>
                    <span className="ui-acc-meta">
                      <span className="ui-badge">
                        {complete}/{group.entries.length} complete
                      </span>
                      <span className="ui-badge ui-num">
                        {earned}/{available} pts
                      </span>
                    </span>
                    <span className="ui-acc-icon" aria-hidden="true" />
                  </summary>

                  <div className="ui-acc-body">
                    <ul className="ui-list-grid">
                      {group.entries.map(({ path, stats }) => {
                        const state = pathState(stats);
                        const isComplete = state.key === "complete";

                        return (
                          <li
                            key={path.id}
                            data-filter-item
                            data-filter-category={group.id}
                            data-filter-text={`${path.title} ${group.name} ${path.difficulty} ${path.type}`}
                          >
                            <article className="ui-row cat-path">
                              <span className={`ui-row-icon${isComplete ? " is-complete" : ""}`} aria-hidden="true">
                                {isComplete ? (
                                  <Check size={17} />
                                ) : stats.labCount > 0 ? (
                                  <Terminal size={17} />
                                ) : (
                                  <BookOpen size={17} />
                                )}
                              </span>

                              <div className="ui-row-main">
                                <h3 className="ui-row-title">
                                  <Link
                                    href={pathHref(path.id)}
                                    className="ui-stretched"
                                    aria-label={`${state.action} ${path.title}`}
                                  >
                                    {path.title}
                                  </Link>
                                </h3>
                                <div className="ui-row-meta">
                                  {path.difficulty && <span className="ui-badge">{path.difficulty}</span>}
                                  <span>{plural(stats.lessonCount, "chapter")}</span>
                                  {stats.labCount > 0 && <span>{plural(stats.labCount, "lab")}</span>}
                                  {path.timeDays > 0 && (
                                    <span>
                                      <CalendarDays size={12} aria-hidden="true" />
                                      {plural(path.timeDays, "day")}
                                    </span>
                                  )}
                                  <span className={`cat-state is-${state.key}`}>{state.label}</span>
                                </div>
                                <div
                                  className={`ui-meter${isComplete ? " is-complete" : ""}`}
                                  role="img"
                                  aria-label={`${stats.earned} of ${stats.available} points earned`}
                                >
                                  <span style={{ "--value": stats.percentage / 100 } as CSSProperties} />
                                </div>
                              </div>

                              <div className="ui-row-end">
                                {stats.readingComplete && (
                                  <Link
                                    href={pathRevisionHref(path.id)}
                                    className="ui-btn ui-btn-quiet ui-btn-sm cat-review"
                                    aria-label={`Review reading: ${path.title}`}
                                  >
                                    Review
                                  </Link>
                                )}
                                <span className="cat-points ui-num">
                                  {stats.earned}
                                  <small>/{stats.available}</small>
                                </span>
                                <span className="ui-arrow" aria-hidden="true">
                                  <ArrowRight size={16} />
                                </span>
                              </div>
                            </article>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </details>
              );
            })}
          </div>
        </CatalogFilter>
      )}
    </WorkspaceShell>
  );
}
