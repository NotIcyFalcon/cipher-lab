"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  FlaskConical,
  RotateCcw,
  Terminal,
} from "lucide-react";

import { type Lesson, type ContentBlock } from "@/content/lessons";
import WorkspaceShell from "@/components/WorkspaceShell";
import LabTerminal from "@/components/LabTerminal";
import type { Progress } from "@/lib/progress-types";
import {
  markReadingComplete,
  completeLab,
  importReadingProgress,
} from "@/app/actions/progress";

type ReadingBlock = Exclude<ContentBlock, { type: "homework" }>;
type ReadingLesson = Omit<Lesson, "blocks"> & {
  blocks: ReadingBlock[];
};

function Quiz({
  block,
}: {
  block: Extract<ContentBlock, { type: "quiz" }>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const correct = selected === block.answer;

  return (
    <section className="quiz-card">
      <span className="eyebrow">QUICK CHECK</span>
      <h3>{block.question}</h3>
      <div className="quiz-options">
        {block.options.map((option, index) => (
          <button
            key={option}
            type="button"
            className={`quiz-option ${
              selected === index ? "selected" : ""
            }`}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            <span className="option-letter">
              {String.fromCharCode(65 + index)}
            </span>
            {option}
            {selected === index && correct && (
              <Check size={18} aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
      <p className="quiz-feedback" aria-live="polite">
        {selected === null
          ? "Take a guess. Curiosity counts."
          : correct
            ? `Exactly! ${block.explanation}`
            : "Not quite. Revisit the notes and try another answer."}
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

  function submitFlag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      <section
        className="lab-card"
        style={{
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          background: "#152119",
          borderColor: "#344738",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Check size={20} color="#b8f777" aria-hidden="true" />
          <strong style={{ color: "#b8f777" }}>
            Practice Completed
          </strong>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setRetrying(true)}
          style={{ fontSize: "12px", padding: "4px 10px", height: "auto" }}
        >
          Reattempt
        </button>
      </section>
    );
  }

  return (
    <section className="lab-card">
      <LabTerminal labId={block.labId} title={block.title} />
      <div className="lab-instructions">
        <span className="eyebrow">YOUR MISSION</span>
        <p>{block.objective}</p>
        <form
          onSubmit={submitFlag}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginTop: "16px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <input
              type="text"
              value={flagInput}
              onChange={(event) => {
                setFlagInput(event.target.value);
                setError(false);
              }}
              placeholder="Enter completion code..."
              aria-label="Lab completion code"
              disabled={submitting}
              style={{
                flex: "1 1 180px",
                minWidth: 0,
                padding: "8px 12px",
                borderRadius: "6px",
                border: error ? "1px solid #ff8b8b" : "1px solid var(--border)",
                background: "#090f13",
                color: "var(--text)",
              }}
            />
            <button
              type="submit"
              disabled={submitting}
              className="primary-button"
              style={{ height: "auto", padding: "8px 16px" }}
            >
              {submitting ? "Checking..." : "Submit"}
            </button>
          </div>
          {error && (
            <span
              role="alert"
              style={{ color: "#ff8b8b", fontSize: "12px", marginLeft: "4px" }}
            >
              Incorrect answer or submission could not finish.
            </span>
          )}
        </form>

        <details>
          <summary
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              textTransform: "uppercase",
            }}
          >
            HINT
          </summary>
          <p style={{ marginTop: "10px" }}>{block.hint}</p>
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
          <pre>
            <code>{block.code}</code>
          </pre>
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

export default function LearningPage({
  lessons,
  progress,
  initialLessonId,
  revision = false,
  pathTitle,
}: {
  lessons: ReadingLesson[];
  progress: Progress;
  initialLessonId: string;
  revision?: boolean;
  pathTitle: string;
}) {
  const [activeId, setActiveId] = useState(initialLessonId);
  const [notice, setNotice] = useState("");
  const [revisionReading, setRevisionReading] = useState<string[]>([]);
  const [saving, startSaving] = useTransition();

  const completed = revision ? revisionReading : progress.readingIds;
  const lesson = lessons.find((item) => item.id === activeId) ?? lessons[0];
  const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);

  const isRead = completed.includes(lesson.id);
  const readCount = lessons.filter((item) => completed.includes(item.id)).length;

  function markAsRead() {
    if (revision) {
      setRevisionReading((current) =>
        current.includes(lesson.id) ? current : [...current, lesson.id],
      );
      setNotice("Reviewed for this visit. Your saved XP is unchanged.");
      return;
    }

    startSaving(async () => {
      try {
        await markReadingComplete(lesson.id);
        setNotice("Reading progress saved.");
      } catch {
        setNotice("Progress could not be saved. Please try again.");
      }
    });
  }

  async function importOldReading() {
    try {
      const raw = window.localStorage.getItem("cipher-lab:reading-progress:v1") ?? "[]";
      await importReadingProgress(raw);
      setNotice("Existing reading progress imported.");
    } catch {
      setNotice("Reading progress could not be imported.");
    }
  }

  return (
    <WorkspaceShell current="/paths">
      <div className="learning-workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <Link href="/paths">Learning paths</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span>{pathTitle}</span>
          </div>
          <span className="pill">SELF-PACED</span>
        </header>

        {revision && (
          <div className="revision-banner" role="note">
            <RotateCcw size={20} aria-hidden="true" />
            <div>
              <strong>Revision mode</strong>
              <p>
                A fresh reading pass for this visit. Your saved XP and previous
                completions are unchanged. Reloading starts this local pass
                over.
              </p>
            </div>
            <Link href="/dashboard" className="secondary-button">
              Exit revision
            </Link>
          </div>
        )}

        <section
          className="learning-chapter-strip"
          aria-label="Path chapters"
        >
          <div className="learning-chapter-heading">
            <span className="dashboard-kicker">CHAPTERS</span>
            <span>
              {readCount} / {lessons.length}{" "}
              {revision ? "reviewed this visit" : "read"}
            </span>
          </div>

          <nav className="learning-chapter-list" aria-label="Lessons">
            {lessons.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`learning-chapter-button${
                  lesson.id === item.id ? " is-active" : ""
                }`}
                aria-current={lesson.id === item.id ? "step" : undefined}
                onClick={() => {
                  setActiveId(item.id);
                  setNotice("");
                }}
              >
                <span className="learning-chapter-number">
                  {completed.includes(item.id) ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                {item.title}
              </button>
            ))}
          </nav>
        </section>

        <section className="hero">
          <div>
            <span className="eyebrow accent">
              CHAPTER {String(lessonIndex + 1).padStart(2, "0")} / GET CURIOUS
            </span>
            <h1>{lesson.title}</h1>
            <p>{lesson.description}</p>
            <div className="lesson-meta">
              <span>Beginner friendly</span>
              <span>{lesson.minutes} min</span>
              <span className="accent">+{lesson.xp} reading XP</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="hero-terminal">
              <Terminal size={46} />
            </div>
            <span className="orbit-dot" />
          </div>
        </section>

        <div className="content-layout">
          <article className="lesson-content" aria-label={lesson.title}>
            {lesson.blocks.map((block) => (
              <LessonBlock
                key={`${lesson.id}:${block.id}`}
                lessonId={lesson.id}
                block={block}
                progress={progress}
                revision={revision}
              />
            ))}

            <footer className="completion-card">
              <div>
                <h3>
                  {revision
                    ? isRead
                      ? "A useful refresher."
                      : "Ready to mark this reviewed?"
                    : isRead
                      ? "Another small win."
                      : "Ready to call this a win?"}
                </h3>
                <p>
                  {revision
                    ? "Revision progress is local to this visit."
                    : "Mark your reading progress when you feel comfortable."}
                </p>
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
                    ? isRead
                      ? "Reviewed"
                      : "Mark as reviewed"
                    : isRead
                      ? "Lesson read"
                      : "Mark as read"}
              </button>
              <p className="save-notice" role="status">
                {notice}
              </p>
            </footer>

            {!revision && (
              <details className="learning-import">
                <summary>Previously learned on this browser?</summary>
                <p>
                  Import reading progress saved by the earlier version of Cyber
                  Box.
                </p>
                <button
                  type="button"
                  onClick={importOldReading}
                  className="secondary-button"
                >
                  Import old progress
                </button>
              </details>
            )}
          </article>

          <aside className="mission-card">
            <span className="mission-icon">
              <FlaskConical size={22} aria-hidden="true" />
            </span>
            <span className="eyebrow">THE GAME PLAN</span>
            <h2>
              Small steps.
              <br />
              Real skills.
            </h2>
            <p>By the end of this chapter, you will be able to:</p>
            <ol>
              {lesson.objectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ol>
            <div className="mission-note">
              No timer. No pressure.
              <br /> You can come back as often as you like.
            </div>
          </aside>
        </div>
      </div>
    </WorkspaceShell>
  );
}
