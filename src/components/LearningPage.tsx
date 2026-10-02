"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  FlaskConical,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
  Terminal,
  Trophy,
  X,
} from "lucide-react";

import type { Lesson, ContentBlock } from "@/content/lessons";
import WorkspaceShell from "@/components/WorkspaceShell";
import LabTerminal from "@/components/LabTerminal";
import type { Progress } from "@/lib/progress-types";
import {
  markReadingComplete,
  completeLab,
} from "@/app/actions/progress";

import "@/app/batch-two.css";

// Display only. Awards remain controlled by the existing server action.
const LAB_POINTS = 50;

type ReadingBlock = Exclude<ContentBlock, { type: "homework" }>;

type ReadingLesson = Omit<Lesson, "blocks"> & {
  blocks: ReadingBlock[];
};

type LearningPageProps = {
  lessons: ReadingLesson[];
  progress: Progress;
  initialLessonId: string;
  revision?: boolean;
  pathTitle: string;
  userId: string;
};

function getLabs(lesson: ReadingLesson) {
  return lesson.blocks.filter(
    (block): block is Extract<ContentBlock, { type: "lab" }> =>
      block.type === "lab",
  );
}

function hasStartedLesson(lesson: ReadingLesson, progress: Progress) {
  return (
    progress.readingIds.includes(lesson.id) ||
    getLabs(lesson).some((block) =>
      progress.labIds.includes(`${lesson.id}:${block.id}`),
    )
  );
}

function getInitialActiveId({
  lessons,
  progress,
  initialLessonId,
  revision,
}: LearningPageProps) {
  if (revision) {
    return (
      lessons.find((lesson) => lesson.id === initialLessonId)?.id ??
      lessons[0]?.id ??
      ""
    );
  }

  const firstUnread = lessons.find(
    (lesson) => !progress.readingIds.includes(lesson.id),
  );
  const requested = lessons.find((lesson) => lesson.id === initialLessonId);

  if (
    requested &&
    (requested.id === firstUnread?.id || hasStartedLesson(requested, progress))
  ) {
    return requested.id;
  }

  return firstUnread?.id ?? lessons[0]?.id ?? "";
}

function Quiz({
  block,
}: {
  block: Extract<ContentBlock, { type: "quiz" }>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState<number | null>(null);

  const questionId = useId();
  const feedbackId = useId();
  const hasChecked = checked !== null;
  const correct = hasChecked && checked === block.answer;

  function selectOption(index: number) {
    setSelected(index);
    // A new selection needs a new explicit check.
    setChecked(null);
  }

  return (
    <section className="quiz-card b5-quiz" aria-labelledby={questionId}>
      <span className="eyebrow">QUICK CHECK</span>
      <h3 id={questionId}>{block.question}</h3>

      <div
        className="quiz-options"
        role="group"
        aria-labelledby={questionId}
      >
        {block.options.map((option, index) => {
          const isSelected = selected === index;
          const isChecked = checked === index;

          const verdictClass = isChecked
            ? correct
              ? " is-correct"
              : " is-incorrect"
            : "";

          return (
            <button
              key={`${block.id}:${index}`}
              type="button"
              className={`quiz-option${
                isSelected ? " selected" : ""
              }${verdictClass}`}
              aria-pressed={isSelected}
              onClick={() => selectOption(index)}
            >
              <span className="option-letter">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="b5-quiz-option-copy">{option}</span>
              {isChecked &&
                (correct ? (
                  <Check size={19} aria-hidden="true" />
                ) : (
                  <X size={19} aria-hidden="true" />
                ))}
            </button>
          );
        })}
      </div>

      <div className="b5-quiz-actions">
        <button
          type="button"
          className="primary-button"
          disabled={selected === null}
          onClick={() => setChecked(selected)}
          aria-describedby={feedbackId}
        >
          <Check size={16} aria-hidden="true" />
          Check
        </button>
        <span>Select an answer, then check it when you are ready.</span>
      </div>

      <p
        id={feedbackId}
        className={`quiz-feedback${
          hasChecked ? (correct ? " is-correct" : " is-incorrect") : ""
        }`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {!hasChecked
          ? selected === null
            ? "Take your time. This is a place to practice."
            : "Answer selected. Click Check to see your feedback."
          : correct
            ? `Correct! ${block.explanation}`
            : "Not quite yet. Revisit the notes, choose an answer, and check again."}
      </p>
    </section>
  );
}

function LabBlock({
  lessonId,
  block,
  isCompleted,
  revision,
}: {
  lessonId: string;
  block: Extract<ContentBlock, { type: "lab" }>;
  isCompleted: boolean;
  revision: boolean;
}) {
  const [retrying, setRetrying] = useState(revision);
  const [flagInput, setFlagInput] = useState("");
  const [error, setError] = useState(false);
  const [submitting, startSubmitting] = useTransition();

  const inputId = useId();
  const errorId = useId();

  function submitFlag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    startSubmitting(async () => {
      try {
        const result = await completeLab(lessonId, block.id, flagInput);
        setError(!result.ok);

        if (result.ok) {
          setRetrying(false);
          setFlagInput("");
        }
      } catch {
        setError(true);
      }
    });
  }

  if (isCompleted && !retrying) {
    return (
      <section className="lab-card lesson-lab-complete">
        <div className="lesson-lab-complete-heading">
          <span className="lesson-lab-complete-icon" aria-hidden="true">
            <Check size={20} />
          </span>
          <div>
            <strong>Practice completed</strong>
            <p>{block.title} · {LAB_POINTS} lab points earned</p>
          </div>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => setRetrying(true)}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Reattempt
        </button>
      </section>
    );
  }

  return (
    <section className="lab-card lesson-lab-card">
      <LabTerminal labId={block.labId} title={block.title} />

      <div className="lab-instructions">
        <span className="eyebrow">YOUR MISSION</span>
        <p>{block.objective}</p>

        {isCompleted && (
          <p className="lesson-lab-reattempt-note">
            You have already earned these lab points. Reattempting does not
            award them again.
          </p>
        )}

        <form className="lesson-lab-form" onSubmit={submitFlag}>
          <label htmlFor={inputId}>Completion code</label>
          <div className="lesson-lab-form-row">
            <input
              id={inputId}
              type="text"
              value={flagInput}
              onChange={(event) => {
                setFlagInput(event.target.value);
                setError(false);
              }}
              placeholder="Enter your completion code"
              disabled={submitting}
              aria-invalid={error || undefined}
              aria-describedby={error ? errorId : undefined}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={submitting || !flagInput.trim()}
              className="primary-button"
            >
              {submitting ? "Checking..." : "Submit code"}
              {!submitting && <ArrowRight size={15} aria-hidden="true" />}
            </button>
          </div>

          {error && (
            <p id={errorId} className="lesson-lab-error" role="alert">
              Incorrect answer or submission could not finish.
            </p>
          )}
        </form>

        <details className="lesson-hint">
          <summary>
            <span className="lesson-hint-icon" aria-hidden="true">
              <Lightbulb size={17} />
            </span>
            <span className="lesson-hint-copy">
              <strong>Need a nudge?</strong>
              <span>Reveal a hint without leaving your practice.</span>
            </span>
            <ChevronDown
              className="lesson-hint-chevron"
              size={17}
              aria-hidden="true"
            />
          </summary>
          <div className="lesson-hint-body">
            <p>{block.hint}</p>
          </div>
        </details>
      </div>
    </section>
  );
}

function LessonBlock({
  lessonId,
  block,
  progress,
  revision,
}: {
  lessonId: string;
  block: ReadingBlock;
  progress: Progress;
  revision: boolean;
}) {
  switch (block.type) {
    case "note":
      return (
        <section className="note">
          <h2>{block.title}</h2>
          <p>{block.body}</p>
        </section>
      );

    case "tip":
      return (
        <aside className="tip">
          <FlaskConical size={21} aria-hidden="true" />
          <div>
            <h3>{block.title}</h3>
            <p>{block.body}</p>
          </div>
        </aside>
      );

    case "code":
      return (
        <section className="code-card">
          <div className="panel-heading">
            <span>{block.title}</span>
            <span className="eyebrow">BASH</span>
          </div>
          <pre><code>{block.code}</code></pre>
          <p className="code-caption">{block.caption}</p>
        </section>
      );

    case "lab":
      return (
        <LabBlock
          lessonId={lessonId}
          block={block}
          isCompleted={progress.labIds.includes(`${lessonId}:${block.id}`)}
          revision={revision}
        />
      );

    case "quiz":
      return <Quiz block={block} />;
  }
}

export default function LearningPage(props: LearningPageProps) {
  const { lessons, progress, revision = false, pathTitle, userId } = props;

  const [activeId, setActiveId] = useState(() => getInitialActiveId(props));
  const [visitedIds, setVisitedIds] = useState<string[]>(() => {
    const initialId = getInitialActiveId(props);
    return initialId ? [initialId] : [];
  });
  const [notice, setNotice] = useState("");
  const [revisionReading, setRevisionReading] = useState<string[]>([]);
  const [savedThisVisit, setSavedThisVisit] = useState<string[]>([]);
  const [saving, startSaving] = useTransition();

  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousActiveId = useRef(activeId);
  const sidebarId = useId();

  const savedReading = new Set([
    ...progress.readingIds,
    ...savedThisVisit,
  ]);
  const completedReading = revision ? new Set(revisionReading) : savedReading;
  const completedLabs = new Set(progress.labIds);

  const lesson = lessons.find((item) => item.id === activeId) ?? lessons[0];
  const lessonIndex = lesson
    ? lessons.findIndex((item) => item.id === lesson.id)
    : -1;

  const nextLesson = lessons[lessonIndex + 1];
  const previousLesson = lessons[lessonIndex - 1];
  const isRead = lesson ? completedReading.has(lesson.id) : false;

  const readCount = lessons.filter((item) =>
    completedReading.has(item.id),
  ).length;

  const firstUnread = lessons.find(
    (item) => !completedReading.has(item.id),
  );

  const accessibleIds = new Set(visitedIds);
  for (const item of lessons) {
    if (
      completedReading.has(item.id) ||
      hasStartedLesson(item, progress)
    ) {
      accessibleIds.add(item.id);
    }
  }

  if (firstUnread) accessibleIds.add(firstUnread.id);
  if (lesson) accessibleIds.add(lesson.id);

  useEffect(() => {
    if (previousActiveId.current === activeId) return;
    previousActiveId.current = activeId;

    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({
      block: "start",
      behavior: "auto",
    });
  }, [activeId]);

  function openLesson(id: string) {
    setVisitedIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setActiveId(id);
    setNotice("");
  }

  function markAsRead() {
    if (!lesson || isRead || saving) return;

    const lessonId = lesson.id;

    if (revision) {
      setRevisionReading((current) =>
        current.includes(lessonId) ? current : [...current, lessonId],
      );
      setNotice("Reviewed for this visit. Your saved XP is unchanged.");
      return;
    }

    startSaving(async () => {
      try {
        await markReadingComplete(lessonId);
        setSavedThisVisit((current) =>
          current.includes(lessonId) ? current : [...current, lessonId],
        );
        setNotice("Reading progress saved.");
      } catch {
        setNotice("Progress could not be saved. Please try again.");
      }
    });
  }

  if (!lesson) {
    return (
      <WorkspaceShell current="/paths" userId={userId}>
        <section className="dashboard-empty lesson-empty">
          <BookOpen size={28} aria-hidden="true" />
          <h1>No chapters available yet.</h1>
          <p>This learning path is still being prepared.</p>
          <Link href="/paths" className="primary-button">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Learning Paths
          </Link>
        </section>
      </WorkspaceShell>
    );
  }

  const lessonLabs = getLabs(lesson);
  const remainingLabCount = lessonLabs.filter(
    (block) => !completedLabs.has(`${lesson.id}:${block.id}`),
  ).length;

  return (
    <WorkspaceShell current="/paths" userId={userId}>
      <div className="lesson-workspace b5-learning">
        <aside
          className="lesson-index"
          aria-label={`${pathTitle} chapter index`}
        >
          <Link href="/paths" className="lesson-index-back">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Learning Paths
          </Link>

          <div className="lesson-index-heading">
            <span className="dashboard-kicker">
              {revision ? "REVISION INDEX" : "YOUR PATH"}
            </span>
            <h2>{pathTitle}</h2>
            <p>
              {readCount} of {lessons.length} chapters{" "}
              {revision ? "reviewed this visit" : "read"}
            </p>
            <progress
              value={readCount}
              max={lessons.length || 1}
              aria-label={`${readCount} of ${lessons.length} chapters ${
                revision ? "reviewed this visit" : "read"
              }`}
            />
          </div>

          <nav className="lesson-index-navigation" aria-label="Chapters">
            <ol className="lesson-index-list">
              {lessons.map((item, index) => {
                const labs = getLabs(item);
                const readingDone = completedReading.has(item.id);
                const unfinishedLabs = labs.some(
                  (block) => !completedLabs.has(`${item.id}:${block.id}`),
                );
                const fullyComplete = readingDone && !unfinishedLabs;
                const showWarning = readingDone && unfinishedLabs;
                const current = lesson.id === item.id;
                const locked = !accessibleIds.has(item.id);
                const lessonPoints = item.xp + labs.length * LAB_POINTS;
                const tooltipId = `${sidebarId}-lab-warning-${index}`;

                const stateLabel = fullyComplete
                  ? revision ? "Reviewed" : "Completed"
                  : showWarning
                    ? "Reading complete"
                    : current
                      ? "Current lesson"
                      : locked ? "Locked" : "In progress";

                const stateClass = fullyComplete
                  ? " is-complete"
                  : showWarning
                    ? " has-unfinished-labs"
                    : locked ? " is-locked" : " is-ongoing";

                return (
                  <li
                    key={item.id}
                    className={`lesson-index-item${stateClass}${
                      current ? " is-current" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="lesson-index-button"
                      disabled={locked || saving}
                      aria-current={current ? "step" : undefined}
                      aria-label={`${index + 1}. ${item.title}. ${
                        lessonPoints
                      } reading and lab points. ${stateLabel}${
                        current && stateLabel !== "Current lesson"
                          ? ". Current lesson"
                          : ""
                      }`}
                      onClick={() => openLesson(item.id)}
                    >
                      <span className="lesson-index-number" aria-hidden="true">
                        {locked ? (
                          <LockKeyhole size={14} />
                        ) : fullyComplete ? (
                          <Check size={15} />
                        ) : (
                          String(index + 1).padStart(2, "0")
                        )}
                      </span>
                      <span className="lesson-index-copy">
                        <strong>{item.title}</strong>
                        <span>
                          {lessonPoints} pts{" "}
                          <span aria-hidden="true"> · </span>
                          {stateLabel}
                        </span>
                      </span>
                    </button>

                    {showWarning && (
                      <span
                        className="lesson-index-warning"
                        tabIndex={0}
                        aria-label="Unfinished labs"
                        aria-describedby={tooltipId}
                      >
                        <span
                          className="lesson-index-warning-dot"
                          aria-hidden="true"
                        />
                        <span
                          id={tooltipId}
                          role="tooltip"
                          className="lesson-index-tooltip"
                        >
                          This lesson has unfinished labs
                        </span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="lesson-index-note">
            <LockKeyhole size={15} aria-hidden="true" />
            <p>
              Mark the current reading complete to unlock the next chapter.
              You can return to unfinished labs later.
            </p>
          </div>

          <p className="lesson-index-points-note">
            Chapter points include reading and labs. Homework points are
            tracked separately on the Homework screen.
          </p>
        </aside>

        <div className="lesson-stage">
          <header className="lesson-breadcrumb-bar">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <Link href="/paths">Learning paths</Link>
              <ChevronRight size={14} aria-hidden="true" />
              <span>{pathTitle}</span>
            </nav>
            <span className="pill">SELF-PACED</span>
          </header>

          {revision && (
            <div className="revision-banner" role="note">
              <RotateCcw size={20} aria-hidden="true" />
              <div>
                <strong>Revision mode</strong>
                <p>
                  A fresh reading pass for this visit. Your saved XP and
                  previous completions are unchanged. Reloading starts this
                  local pass over.
                </p>
              </div>
              <Link href="/paths" className="secondary-button">
                Exit revision
              </Link>
            </div>
          )}

          <header className="lesson-hero">
            <span className="dashboard-kicker">
              CHAPTER {String(lessonIndex + 1).padStart(2, "0")} OF{" "}
              {String(lessons.length).padStart(2, "0")}
            </span>
            <h1 ref={headingRef} tabIndex={-1}>{lesson.title}</h1>
            <p>{lesson.description}</p>

            <div className="lesson-hero-meta">
              <span>
                <BookOpen size={14} aria-hidden="true" />
                Beginner friendly
              </span>
              <span>
                <Clock3 size={14} aria-hidden="true" />
                {lesson.minutes} min reading
              </span>
              <span>
                <Trophy size={14} aria-hidden="true" />
                {lesson.xp} reading pts
              </span>
              {lessonLabs.length > 0 && (
                <span>
                  <Terminal size={14} aria-hidden="true" />
                  {lessonLabs.length * LAB_POINTS} lab pts
                </span>
              )}
            </div>
          </header>

          <aside className="lesson-plan" aria-label="Chapter objectives">
            <div className="lesson-plan-heading">
              <span className="lesson-plan-icon" aria-hidden="true">
                <FlaskConical size={20} />
              </span>
              <div>
                <span className="dashboard-kicker">OBJECTIVES</span>
                <h2>What you will learn</h2>
              </div>
            </div>
            <ol>
              {lesson.objectives.map((objective, index) => (
                <li key={`${lesson.id}:objective:${index}`}>
                  {objective}
                </li>
              ))}
            </ol>
          </aside>

          <article
            className="lesson-content lesson-reading-content"
            aria-label={lesson.title}
          >
            {lesson.blocks.map((block) => (
              <LessonBlock
                key={`${lesson.id}:${block.id}:${
                  revision ? "revision" : "learn"
                }`}
                lessonId={lesson.id}
                block={block}
                progress={progress}
                revision={revision}
              />
            ))}

            <section className="completion-card lesson-reading-completion">
              <div>
                <h2>
                  {revision
                    ? isRead
                      ? "Revision complete."
                      : "Ready to mark this reviewed?"
                    : isRead
                      ? "Reading complete."
                      : "Finished reading?"}
                </h2>
              </div>

              <button
                type="button"
                className="primary-button"
                disabled={isRead || saving}
                onClick={markAsRead}
              >
                {isRead ? (
                  <Check size={17} aria-hidden="true" />
                ) : (
                  <ArrowUpRight size={17} aria-hidden="true" />
                )}
                {saving
                  ? "Saving..."
                  : revision
                    ? isRead ? "Reviewed" : "Mark as reviewed"
                    : isRead ? "Lesson read" : "Mark as read"}
              </button>
            </section>

            <p className="save-notice lesson-save-notice" role="status">
              {notice}
            </p>

            <footer className="lesson-bottom-navigation">
              <div className="lesson-bottom-copy">
                <span className="dashboard-kicker">
                  {nextLesson ? "KEEP YOUR MOMENTUM" : "LAST CHAPTER"}
                </span>
                <h2>
                  {nextLesson ? nextLesson.title : "Bring it all together."}
                </h2>
                <p>
                  {!isRead
                    ? revision
                      ? "Mark this chapter reviewed to continue."
                      : "Mark this chapter as read to continue."
                    : remainingLabCount > 0
                      ? `${remainingLabCount} ${
                          remainingLabCount === 1 ? "lab is" : "labs are"
                        } still unfinished. You can return to practice later.`
                      : nextLesson
                        ? "Your next discovery is one chapter away."
                        : "Return to Learning Paths to see your points and remaining practice."}
                </p>
              </div>

              <nav
                className="lesson-bottom-actions"
                aria-label="Lesson navigation"
              >
                {previousLesson && accessibleIds.has(previousLesson.id) && (
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={saving}
                    onClick={() => openLesson(previousLesson.id)}
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                    Previous
                  </button>
                )}

                {nextLesson ? (
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!isRead || saving}
                    onClick={() => openLesson(nextLesson.id)}
                  >
                    Go to Next Lesson
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                ) : isRead && !saving ? (
                  <Link href="/paths" className="primary-button">
                    Finish Path
                    <Check size={16} aria-hidden="true" />
                  </Link>
                ) : (
                  <button type="button" className="primary-button" disabled>
                    Finish Path
                    <Check size={16} aria-hidden="true" />
                  </button>
                )}
              </nav>
            </footer>
          </article>
        </div>
      </div>
    </WorkspaceShell>
  );
}
