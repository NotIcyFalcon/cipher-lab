import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  FileCode2,
  FolderOpen,
  Layers3,
  RotateCcw,
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
  if (complete) return { key: "complete", label: "Complete", action: "Revisit path" } as const;
  if (stats.readingComplete) return { key: "practice", label: "Reading done", action: "Continue practice" } as const;
  if (stats.started) return { key: "progress", label: "In progress", action: "Continue path" } as const;
  return { key: "new", label: "Ready to start", action: "Start path" } as const;
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

  // Open the topics you are working in, plus the first one.
  const openTopics = new Set(
    groups
      .filter((group) => group.entries.some(({ stats }) => ["progress", "practice"].includes(pathState(stats).key)))
      .map((group) => group.id),
  );
  if (groups[0]) openTopics.add(groups[0].id);

  return (
    <WorkspaceShell current="/paths" userId={userId}>
      <header className="ui-page-head cat-hero">
        <div className="cat-hero-copy">
          <span className="ui-eyebrow">Learning library</span>
          <h1 className="ui-title">
            Learning <em>paths</em>
          </h1>
          <p className="ui-lede">
            Guided chapters with hands-on labs and homework. Pick a topic, follow a path, and watch your points stack
            up.
          </p>
        </div>
        <dl className="cat-hero-stats" aria-label="Library overview">
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
          <div className="ui-accordion cat-topics">
            {groups.map((group, index) => {
              const complete = group.entries.filter(({ stats }) => pathState(stats).key === "complete").length;
              const earned = group.entries.reduce((sum, { stats }) => sum + stats.earned, 0);
              const available = group.entries.reduce((sum, { stats }) => sum + stats.available, 0);

              return (
                <details key={group.id} className="ui-acc cat-topic" open={openTopics.has(group.id)} data-filter-group>
                  <summary>
                    <span className="ui-acc-title">
                      <span className="cat-topic-index" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
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
                    <ul className="ui-tile-grid">
                      {group.entries.map(({ path, stats }) => (
                        <li
                          key={path.id}
                          data-filter-item
                          data-filter-category={group.id}
                          data-filter-text={`${path.title} ${group.name} ${path.difficulty} ${path.type}`}
                        >
                          <PathCard path={path} stats={stats} />
                        </li>
                      ))}
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

function PathCard({ path, stats }: PathEntry) {
  const state = pathState(stats);
  const isComplete = state.key === "complete";

  return (
    <article className="ui-tile cat-card">
      <div className="cat-card-top">
        <span className={`cat-card-icon${isComplete ? " is-complete" : ""}`} aria-hidden="true">
          {isComplete ? <Check size={20} /> : stats.labCount > 0 ? <Terminal size={20} /> : <BookOpen size={20} />}
        </span>
        <span className={`cat-state-badge is-${state.key}`}>
          {isComplete && <Check size={12} aria-hidden="true" />}
          {state.label}
        </span>
      </div>

      <div className="cat-card-body">
        <span className="ui-label">Learning path</span>
        <h3 className="cat-card-title">
          <Link href={pathHref(path.id)} className="ui-stretched" aria-label={`${state.action}: ${path.title}`}>
            {path.title}
          </Link>
        </h3>
        <p className="cat-card-sub">
          {plural(stats.lessonCount, "chapter")}
          {stats.labCount > 0 && ` · ${plural(stats.labCount, "lab")}`}
          {stats.homeworkCount > 0 && ` · ${plural(stats.homeworkCount, "homework question")}`}
        </p>
        <div className="cat-card-tags">
          {path.difficulty && <span>{path.difficulty}</span>}
          <span>{path.type}</span>
          {path.timeDays > 0 && (
            <span>
              <CalendarDays size={12} aria-hidden="true" />
              {plural(path.timeDays, "day")}
            </span>
          )}
        </div>
      </div>

      <dl className="cat-card-points" aria-label={`${path.title} points breakdown`}>
        <div>
          <dt>
            <BookOpen size={13} aria-hidden="true" />
            Reading
          </dt>
          <dd>
            {stats.readingEarned}
            <span>/{stats.readingAvailable}</span>
          </dd>
        </div>
        <div>
          <dt>
            <Terminal size={13} aria-hidden="true" />
            Labs
          </dt>
          <dd>
            {stats.labsEarned}
            <span>/{stats.labsAvailable}</span>
          </dd>
        </div>
        {stats.homeworkAvailable > 0 && (
          <div>
            <dt>
              <FileCode2 size={13} aria-hidden="true" />
              Homework
            </dt>
            <dd>
              {stats.homeworkEarned}
              <span>/{stats.homeworkAvailable}</span>
            </dd>
          </div>
        )}
      </dl>

      <div className="cat-card-progress">
        <div className="cat-card-progress-head">
          <span>Path points</span>
          <strong className="ui-num">
            {stats.earned} <span>/ {stats.available}</span>
          </strong>
        </div>
        <div
          className={`ui-meter${isComplete ? " is-complete" : ""}`}
          role="img"
          aria-label={`${stats.earned} of ${stats.available} points earned`}
        >
          <span style={{ "--value": stats.percentage / 100 } as CSSProperties} />
        </div>
        <p>
          {stats.percentage}% · {stats.readingCount}/{stats.lessonCount} chapters read
          {stats.labCount > 0 && ` · ${stats.completedLabCount}/${stats.labCount} labs`}
        </p>
      </div>

      <footer className="cat-card-foot">
        <span className="cat-card-cta" aria-hidden="true">
          {state.action}
          <ArrowRight size={14} />
        </span>
        {stats.readingComplete && (
          <Link href={pathRevisionHref(path.id)} className="cat-card-link" aria-label={`Review reading: ${path.title}`}>
            <RotateCcw size={13} aria-hidden="true" />
            Review
          </Link>
        )}
      </footer>
    </article>
  );
}
