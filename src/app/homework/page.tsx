import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Check, Eye, FileCode2, ListChecks, Lock, LockOpen, Trophy } from "lucide-react";
import CatalogFilter from "@/components/ui/CatalogFilter";
import { getPathProgress } from "@/lib/path-progress";
import type { LearningPath } from "@/lib/content-types";
import { getPaths } from "@/server/catalog";
import { requireUserId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import { isHomeworkPathUnlocked } from "@/server/homework-catalog";
import "@/styles/pages/catalog.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Assignment = {
  path: LearningPath;
  unlocked: boolean;
  /** The admin can open locked homework to test it. */
  preview: boolean;
  earned: number;
  available: number;
  solved: number;
  readingCount: number;
  lessonCount: number;
};

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

// WorkspaceShell comes from homework/layout.tsx.
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

  const assignments: Assignment[] = paths.map((path) => {
    const unlocked = isHomeworkPathUnlocked(userId, path.id);
    const stats = getPathProgress(path, progress);
    let earned = 0;
    let available = 0;
    let solved = 0;

    for (const question of path.homework) {
      const best = Math.min(question.totalPoints, Math.max(0, progress.homeworkQuestionBest[question.questionId] ?? 0));
      earned += best;
      available += question.totalPoints;
      if (question.totalPoints > 0 && best >= question.totalPoints) solved += 1;
    }

    return {
      path,
      unlocked,
      preview: unlocked && !stats.readingComplete,
      earned,
      available,
      solved,
      readingCount: stats.readingCount,
      lessonCount: stats.lessonCount,
    };
  });

  const topics = new Map<string, { id: string; name: string; items: Assignment[] }>();
  for (const assignment of assignments) {
    const topic = topics.get(assignment.path.topicId) ?? {
      id: assignment.path.topicId,
      name: assignment.path.topicName,
      items: [],
    };
    topic.items.push(assignment);
    topics.set(assignment.path.topicId, topic);
  }
  const groups = [...topics.values()];

  const totals = assignments.reduce(
    (sum, item) => ({
      questions: sum.questions + item.path.homework.length,
      unlocked: sum.unlocked + (item.unlocked ? 1 : 0),
      earned: sum.earned + item.earned,
      available: sum.available + item.available,
    }),
    { questions: 0, unlocked: 0, earned: 0, available: 0 },
  );

  return (
    <>
      <header className="ui-page-head cat-hero">
        <div className="cat-hero-copy">
          <span className="ui-eyebrow">Assignments</span>
          <h1 className="ui-title">
            Home<em>work</em>
          </h1>
          <p className="ui-lede">
            Finish a learning path&apos;s chapters to unlock its homework. Every passing test earns XP, a
            question&apos;s bonus is added when all of its tests pass, and only your best attempt counts.
          </p>
          {typeof query.path === "string" && (
            <Link href="/homework" className="ui-btn ui-btn-ghost ui-btn-sm cat-hero-action">
              Show all homework
            </Link>
          )}
        </div>
        <dl className="cat-hero-stats" aria-label="Homework overview">
          <div>
            <dt>
              <FileCode2 size={14} aria-hidden="true" />
              Assignments
            </dt>
            <dd>{assignments.length}</dd>
          </div>
          <div>
            <dt>
              <ListChecks size={14} aria-hidden="true" />
              Questions
            </dt>
            <dd>{totals.questions}</dd>
          </div>
          <div>
            <dt>
              <LockOpen size={14} aria-hidden="true" />
              Unlocked
            </dt>
            <dd>
              {totals.unlocked} <span>/ {assignments.length}</span>
            </dd>
          </div>
          <div>
            <dt>
              <Trophy size={14} aria-hidden="true" />
              XP
            </dt>
            <dd>
              {totals.earned} <span>/ {totals.available}</span>
            </dd>
          </div>
        </dl>
      </header>

      {groups.length === 0 ? (
        <section className="ui-empty">
          <FileCode2 size={28} aria-hidden="true" />
          <h2>No homework yet</h2>
          <p>Assignments appear here after they have been created.</p>
        </section>
      ) : (
        <CatalogFilter
          label="Filter homework"
          placeholder="Search homework"
          categories={groups.map((group) => ({ id: group.id, label: group.name, count: group.items.length }))}
        >
          <div className="ui-accordion cat-topics">
            {groups.map((group, index) => {
              const open = index === 0 || group.items.some((item) => item.unlocked && item.solved < item.path.homework.length);

              return (
                <details key={group.id} className="ui-acc cat-topic" open={open} data-filter-group>
                  <summary>
                    <span className="ui-acc-title">
                      <span className="cat-topic-index" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h2>{group.name}</h2>
                      <span className="ui-label">{plural(group.items.length, "assignment")}</span>
                    </span>
                    <span className="ui-acc-meta">
                      <span className="ui-badge">
                        {group.items.filter((item) => item.unlocked).length}/{group.items.length} unlocked
                      </span>
                    </span>
                    <span className="ui-acc-icon" aria-hidden="true" />
                  </summary>

                  <div className="ui-acc-body">
                    <ul className="ui-tile-grid">
                      {group.items.map((item) => (
                        <li
                          key={item.path.id}
                          data-filter-item
                          data-filter-category={group.id}
                          data-filter-text={`${item.path.title} ${group.name} ${item.path.homework
                            .map((question) => question.title)
                            .join(" ")}`}
                        >
                          {item.unlocked ? <HomeworkCard item={item} /> : <LockedCard item={item} />}
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
    </>
  );
}

function HomeworkCard({ item }: { item: Assignment }) {
  const { path, earned, available, solved } = item;
  const total = path.homework.length;
  const complete = total > 0 && solved >= total;
  const percentage = available > 0 ? Math.round((earned / available) * 100) : 0;
  const state = complete ? "complete" : earned > 0 ? "progress" : "new";
  const label = complete ? "Complete" : earned > 0 ? "In progress" : "Not started";

  return (
    <article className="ui-tile cat-card" data-spot>
      <div className="cat-card-top">
        <span className={`cat-card-icon${complete ? " is-complete" : ""}`} aria-hidden="true">
          {complete ? <Check size={20} /> : <FileCode2 size={20} />}
        </span>
        <span className={`cat-state-badge is-${state}`}>
          {complete && <Check size={12} aria-hidden="true" />}
          {label}
        </span>
      </div>

      <div className="cat-card-body">
        <span className="ui-label">Homework</span>
        <h3 className="cat-card-title">
          <Link href={`/homework/${encodeURIComponent(path.id)}`} className="ui-stretched">
            {path.title}
          </Link>
        </h3>
        <p className="cat-card-sub">
          {plural(total, "question")} · {solved}/{total} solved
        </p>
        {item.preview && (
          <div className="cat-card-tags">
            <span className="is-accent" title="Learners see this as locked until the path is read">
              <Eye size={12} aria-hidden="true" />
              Admin preview
            </span>
          </div>
        )}
      </div>

      <ul className="cat-card-questions">
        {path.homework.slice(0, 3).map((question, index) => (
          <li key={question.questionId}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            {question.title || `Question ${index + 1}`}
          </li>
        ))}
        {total > 3 && <li className="is-more">+{total - 3} more</li>}
      </ul>

      <div className="cat-card-progress">
        <div className="cat-card-progress-head">
          <span>Homework XP</span>
          <strong className="ui-num">
            {earned} <span>/ {available}</span>
          </strong>
        </div>
        <div className={`ui-meter${complete ? " is-complete" : ""}`} role="img" aria-label={`${earned} of ${available} XP earned`}>
          <span style={{ "--value": percentage / 100 } as CSSProperties} />
        </div>
      </div>

      <footer className="cat-card-foot">
        <span className="cat-card-cta" aria-hidden="true">
          {complete ? "Review answers" : earned > 0 ? "Continue homework" : "Open homework"}
          <ArrowRight size={14} />
        </span>
      </footer>
    </article>
  );
}

/** Locked homework is shown but cannot be opened or focused. */
function LockedCard({ item }: { item: Assignment }) {
  const { path, available, readingCount, lessonCount } = item;

  return (
    <article className="ui-tile cat-card is-locked" data-spot>
      <div className="cat-card-top">
        <span className="cat-card-icon is-locked" aria-hidden="true">
          <Lock size={18} />
        </span>
        <span className="cat-state-badge is-locked">Locked</span>
      </div>

      <div className="cat-card-body">
        <span className="ui-label">Homework</span>
        <h3 className="cat-card-title">{path.title}</h3>
        <p className="cat-card-sub">
          {plural(path.homework.length, "question")} · {available} XP
        </p>
      </div>

      <p className="cat-lock-message">
        <Lock size={14} aria-hidden="true" />
        Complete {path.title} to unlock
      </p>

      <div className="cat-card-progress">
        <div className="cat-card-progress-head">
          <span>Chapters read</span>
          <strong className="ui-num">
            {readingCount} <span>/ {lessonCount}</span>
          </strong>
        </div>
        <div className="ui-meter" role="img" aria-label={`${readingCount} of ${lessonCount} chapters read`}>
          <span style={{ "--value": lessonCount > 0 ? readingCount / lessonCount : 0 } as CSSProperties} />
        </div>
      </div>
    </article>
  );
}
