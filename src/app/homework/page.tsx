import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  FileCode2,
  FlaskConical,
  FolderOpen,
  LockKeyhole,
  ShieldCheck,
  Trophy,
} from "lucide-react";

import { paths } from "@/content/paths";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import {
  canAccessHomeworkChapter,
  homeworkChapters,
} from "@/server/homework-catalog";

import "@/app/batch-two.css";
import "@/app/batch-three.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const number = (value: number) => value.toLocaleString("en-US");

export default async function HomeworkPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const userId = await requireRonakId();
  const progress = getProgress(userId);
  const query = await searchParams;

  const requestedPath =
    typeof query.path === "string" ? query.path : undefined;

  const selectedPath = paths.find((path) => path.id === requestedPath);
  const visiblePaths = selectedPath ? [selectedPath] : paths;

  const groups = visiblePaths.map((path) => {
    const chapters = homeworkChapters.filter((chapter) =>
      path.lessonIds.includes(chapter.id),
    );

    const entries = chapters.map((chapter) => {
      const earned = chapter.questions.reduce(
        (sum, question) =>
          sum +
          Math.min(
            question.totalPoints,
            Math.max(0, progress.homeworkBest[question.homeworkId] ?? 0),
          ),
        0,
      );

      const available = chapter.questions.reduce(
        (sum, question) => sum + question.totalPoints,
        0,
      );

      const solved = chapter.questions.filter(
        (question) =>
          (progress.homeworkBest[question.homeworkId] ?? 0) >=
          question.totalPoints,
      ).length;

      const tests = chapter.questions.reduce(
        (sum, question) => sum + question.totalTests,
        0,
      );

      return {
        chapter,
        earned,
        available,
        solved,
        tests,
        unlocked: canAccessHomeworkChapter(chapter.id, progress.readingIds),
        complete:
          chapter.questions.length > 0 &&
          solved === chapter.questions.length,
        percentage: available > 0 ? Math.round((earned / available) * 100) : 0,
      };
    });

    return { path, entries };
  });

  const entries = groups.flatMap((group) => group.entries);
  const unlockedCount = entries.filter((entry) => entry.unlocked).length;

  const totalQuestions = entries.reduce(
    (sum, entry) => sum + entry.chapter.questions.length,
    0,
  );
  const totalEarned = entries.reduce((sum, entry) => sum + entry.earned, 0);
  const totalAvailable = entries.reduce(
    (sum, entry) => sum + entry.available,
    0,
  );

  return (
    <div className="hw-page b5-homework">
      <header className="paths-heading hw-page-heading">
        <div>
          <span className="dashboard-kicker">YOUR PRACTICE WORKSPACE</span>
          <h1>
            {selectedPath ? `${selectedPath.title} homework` : "Make it work."}
          </h1>
          <p>
            Your learning topics, now in practice. Write a solution, learn
            from the feedback, and build on your best score.
          </p>
        </div>
        <span className="paths-heading-icon" aria-hidden="true">
          <FileCode2 size={34} />
        </span>
      </header>

      {selectedPath && (
        <div className="hw-filter-bar">
          <span>
            <FolderOpen size={15} aria-hidden="true" />
            Showing {selectedPath.title}
          </span>
          <Link href="/homework" className="dashboard-text-link">
            <ArrowLeft size={14} aria-hidden="true" />
            All homework
          </Link>
        </div>
      )}

      <dl className="paths-summary" aria-label="Homework overview">
        <div>
          <dt>
            <BookOpen size={16} aria-hidden="true" />
            Chapters unlocked
          </dt>
          <dd>
            {unlockedCount} <span>/ {entries.length}</span>
          </dd>
        </div>
        <div>
          <dt>
            <FileCode2 size={16} aria-hidden="true" />
            Practice questions
          </dt>
          <dd>{totalQuestions}</dd>
        </div>
        <div>
          <dt>
            <Trophy size={16} aria-hidden="true" />
            Your homework XP
          </dt>
          <dd>
            {number(totalEarned)} <span>/ {number(totalAvailable)}</span>
          </dd>
        </div>
      </dl>

      <div className="hw-unlock-note" role="note">
        <span className="hw-note-icon" aria-hidden="true">
          <LockKeyhole size={18} />
        </span>
        <div>
          <strong>Same topics. Your next step in each chapter.</strong>
          <p>
            Complete a chapter&apos;s reading to unlock its homework.
            Labs are not required. Only your best score for each question
            contributes XP.
          </p>
        </div>
      </div>

      {groups.length > 0 ? (
        groups.map(({ path, entries: topicEntries }, groupIndex) => (
          <section
            key={path.id}
            className="hw-catalog-section b5-homework-topic"
            aria-labelledby={`homework-topic-${groupIndex}`}
          >
            <div className="dashboard-section-heading">
              <div>
                <span className="dashboard-kicker">TOPIC</span>
                <h2 id={`homework-topic-${groupIndex}`}>{path.title}</h2>
                <p>Reading and practice belong to the same learning journey.</p>
              </div>
              <span className="paths-category-count">
                {topicEntries.length}{" "}
                {topicEntries.length === 1 ? "chapter" : "chapters"}
              </span>
            </div>

            {topicEntries.length > 0 ? (
              <ul className="hw-catalog">
                {topicEntries.map((entry) => {
                  const {
                    chapter,
                    earned,
                    available,
                    solved,
                    tests,
                    unlocked,
                    complete,
                    percentage,
                  } = entry;

                  const stateLabel = !unlocked
                    ? "Locked"
                    : complete
                      ? "Completed"
                      : earned > 0 ? "In progress" : "Ready to practice";

                  const actionLabel = complete
                    ? "Review homework"
                    : earned > 0 ? "Continue homework" : "Open homework";

                  return (
                    <li key={chapter.id}>
                      <article
                        className={`paths-course-card hw-chapter-card${
                          !unlocked ? " is-locked" : ""
                        }`}
                      >
                        <div className="paths-course-top">
                          <span
                            className="dashboard-path-icon hw-chapter-icon"
                            aria-hidden="true"
                          >
                            {unlocked ? (
                              <FileCode2 size={23} />
                            ) : (
                              <LockKeyhole size={22} />
                            )}
                          </span>
                          <span
                            className={`dashboard-state${
                              !unlocked
                                ? " hw-state-locked"
                                : complete ? " is-complete" : ""
                            }`}
                          >
                            {!unlocked ? (
                              <LockKeyhole size={12} aria-hidden="true" />
                            ) : complete ? (
                              <Check size={12} aria-hidden="true" />
                            ) : (
                              <ShieldCheck size={12} aria-hidden="true" />
                            )}
                            {stateLabel}
                          </span>
                        </div>

                        <div className="paths-course-body">
                          <span className="dashboard-kicker">
                            CHAPTER PRACTICE
                          </span>
                          <h3>{chapter.title}</h3>
                          <p>{chapter.description}</p>

                          <div className="paths-course-tags">
                            <span>
                              <FileCode2 size={12} aria-hidden="true" />
                              {chapter.questions.length}{" "}
                              {chapter.questions.length === 1
                                ? "question"
                                : "questions"}
                            </span>
                            <span>
                              <FlaskConical size={12} aria-hidden="true" />
                              {tests} {tests === 1 ? "test" : "tests"}
                            </span>
                            <span>Bash scripts</span>
                          </div>
                        </div>

                        <div className="paths-course-progress">
                          <div>
                            <span>Best scores combined</span>
                            <strong>
                              {number(earned)}{" "}
                              <span>/ {number(available)} XP</span>
                            </strong>
                          </div>
                          <progress
                            value={earned}
                            max={available || 1}
                            aria-label={`${chapter.title}: ${earned} of ${available} homework XP earned`}
                          />
                          <p>
                            {percentage}% of points earned · {solved}/
                            {chapter.questions.length} questions fully scored
                          </p>
                        </div>

                        <footer className="paths-course-footer hw-chapter-footer">
                          {unlocked ? (
                            <>
                              <Link
                                href={`/homework/${encodeURIComponent(chapter.id)}`}
                                className="primary-button"
                                aria-label={`${actionLabel}: ${chapter.title}`}
                              >
                                {actionLabel}
                                <ArrowRight size={15} aria-hidden="true" />
                              </Link>
                              <span className="hw-footer-note">
                                Reading completed
                              </span>
                            </>
                          ) : (
                            <p className="b5-homework-lock-message">
                              <LockKeyhole size={16} aria-hidden="true" />
                              <span>
                                Finish reading {chapter.title} to unlock
                              </span>
                            </p>
                          )}
                        </footer>
                      </article>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="b5-topic-empty">
                <FileCode2 size={22} aria-hidden="true" />
                <p>No homework has been added to this topic yet.</p>
              </div>
            )}
          </section>
        ))
      ) : (
        <section className="dashboard-empty">
          <FileCode2 size={30} aria-hidden="true" />
          <h2>Your next practice mission is on its way.</h2>
          <p>Homework topics will appear here as content is added.</p>
        </section>
      )}
    </div>
  );
}
