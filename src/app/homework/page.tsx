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
    const readingComplete = getPathProgress(path, progress).readingComplete;
    let earned = 0;
    let available = 0;
    let solved = 0;

    for (const question of path.homework) {
      const best = Math.min(question.totalPoints, Math.max(0, progress.homeworkQuestionBest[question.questionId] ?? 0));
      earned += best;
      available += question.totalPoints;
      if (question.totalPoints > 0 && best >= question.totalPoints) solved += 1;
    }

    return { path, unlocked, preview: unlocked && !readingComplete, earned, available, solved };
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
      <header className="ui-page-head">
        <span className="ui-eyebrow">Assignments</span>
        <div className="ui-page-head-row">
          <div>
            <h1 className="ui-title">
              Home<em>work</em>
            </h1>
            <p className="ui-lede">
              Finish a learning path&apos;s chapters to unlock its homework. Every passing test earns XP, a
              question&apos;s bonus is added when all of its tests pass, and only your best attempt counts.
            </p>
          </div>
          {typeof query.path === "string" && (
            <Link href="/homework" className="ui-btn ui-btn-ghost ui-btn-sm">
              Show all homework
            </Link>
          )}
        </div>
        <dl className="ui-stats" aria-label="Homework overview">
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
          <div className="ui-accordion">
            {groups.map((group, index) => {
              const open = index === 0 || group.items.some((item) => item.unlocked && item.solved < item.path.homework.length);

              return (
                <details key={group.id} className="ui-acc" open={open} data-filter-group>
                  <summary>
                    <span className="ui-acc-title">
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
                    <ul className="ui-list-grid">
                      {group.items.map((item) => (
                        <li
                          key={item.path.id}
                          data-filter-item
                          data-filter-category={group.id}
                          data-filter-text={`${item.path.title} ${group.name} ${item.path.homework
                            .map((question) => question.title)
                            .join(" ")}`}
                        >
                          {item.unlocked ? <UnlockedRow item={item} /> : <LockedRow item={item} />}
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

function UnlockedRow({ item }: { item: Assignment }) {
  const { path, earned, available, solved } = item;
  const total = path.homework.length;
  const complete = total > 0 && solved >= total;
  const percentage = available > 0 ? Math.round((earned / available) * 100) : 0;
  const status = complete ? "Complete" : earned > 0 ? "In progress" : "Not started";

  return (
    <article className="ui-row cat-homework">
      <span className={`ui-row-icon${complete ? " is-complete" : ""}`} aria-hidden="true">
        {complete ? <Check size={17} /> : <FileCode2 size={17} />}
      </span>

      <div className="ui-row-main">
        <h3 className="ui-row-title">
          <Link href={`/homework/${encodeURIComponent(path.id)}`} className="ui-stretched">
            {path.title}
          </Link>
        </h3>
        <div className="ui-row-meta">
          <span>{plural(total, "question")}</span>
          <span>
            {solved}/{total} solved
          </span>
          <span className={`cat-state is-${complete ? "complete" : earned > 0 ? "progress" : "new"}`}>{status}</span>
          {item.preview && (
            <span className="ui-badge ui-badge-accent" title="Learners see this as locked until the path is read">
              <Eye size={11} aria-hidden="true" />
              Admin preview
            </span>
          )}
        </div>
        <div
          className={`ui-meter${complete ? " is-complete" : ""}`}
          role="img"
          aria-label={`${earned} of ${available} XP earned`}
        >
          <span style={{ "--value": percentage / 100 } as CSSProperties} />
        </div>
      </div>

      <div className="ui-row-end">
        <span className="cat-points ui-num">
          {earned}
          <small>/{available} XP</small>
        </span>
        <span className="ui-arrow" aria-hidden="true">
          <ArrowRight size={16} />
        </span>
      </div>
    </article>
  );
}

/** Locked homework is shown but cannot be opened or focused. */
function LockedRow({ item }: { item: Assignment }) {
  const { path, available } = item;

  return (
    <article className="ui-row cat-homework is-locked">
      <span className="ui-row-icon" aria-hidden="true">
        <Lock size={16} />
      </span>

      <div className="ui-row-main">
        <h3 className="ui-row-title">{path.title}</h3>
        <div className="ui-row-meta">
          <span>{plural(path.homework.length, "question")}</span>
          <span>{available} XP</span>
        </div>
        <p className="ui-lock-note">
          <Lock size={12} aria-hidden="true" />
          Complete {path.title} to unlock
        </p>
      </div>
    </article>
  );
}
