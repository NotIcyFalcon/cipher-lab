"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  FlaskConical,
  Terminal,
  Trophy,
} from "lucide-react";
import { lessons, type ContentBlock } from "@/content/lessons";
import LabTerminal from "@/components/LabTerminal";
import HomeworkBlock from "@/components/HomeworkBlock";
import {
  readHomeworkXp,
  readServerHomeworkXp,
  subscribeToHomeworkProgress,
} from "@/lib/homework-progress";

const PROGRESS_KEY = "cipher-lab:reading-progress:v1";
const PROGRESS_EVENT = "cipher-lab:progress";

function subscribeToProgress(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PROGRESS_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PROGRESS_EVENT, callback);
  };
}

function readProgress() {
  try {
    return window.localStorage.getItem(PROGRESS_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function readServerProgress() {
  return "[]";
}

function decodeProgress(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return lessons
      .filter((lesson) => parsed.includes(lesson.id))
      .map((lesson) => lesson.id);
  } catch {
    return [];
  }
}

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
            className={`quiz-option ${selected === index ? "selected" : ""}`}
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

function LabBlock({ block }: { block: Extract<ContentBlock, { type: "lab" }> }) {
  const [completed, setCompleted] = useState(false);
  const [flagInput, setFlagInput] = useState("");
  const [error, setError] = useState(false);

  const correctFlag = "cyberbox-flag"; // You can replace this with hashed checks later

  function submitFlag(e: React.FormEvent) {
    e.preventDefault();
    if (flagInput.trim().toLowerCase() === correctFlag) {
      setCompleted(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  if (completed) {
    return (
      <section className="lab-card" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#152119", borderColor: "#344738" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Check size={20} color="#b8f777" />
          <strong style={{ color: "#b8f777" }}>Practice Completed</strong>
        </div>
        <button className="secondary-button" onClick={() => { setCompleted(false); setFlagInput(""); }} style={{ fontSize: "12px", padding: "4px 10px", height: "auto" }}>
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
        
        <form onSubmit={submitFlag} style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <input 
              type="text" 
              value={flagInput}
              onChange={(e) => { setFlagInput(e.target.value); setError(false); }}
              placeholder="Enter completion code..."
              style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", border: error ? "1px solid #ff8b8b" : "1px solid var(--border)", background: "#090f13", color: "var(--text)", outline: "none" }}
            />
            <button type="submit" className="primary-button" style={{ height: "auto", padding: "8px 16px" }}>Submit</button>
          </div>
          {error && <span style={{ color: "#ff8b8b", fontSize: "12px", marginLeft: "4px" }}>Incorrect answer</span>}
        </form>

        <details>
          <summary style={{ fontSize: "16px", fontWeight: "bold", textTransform: "uppercase" }}>HINT</summary>
          <p style={{ marginTop: "10px" }}>{block.hint}</p>
        </details>
      </div>
    </section>
  );
}

function LessonBlock({ block }: { block: ContentBlock }) {
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
      return <LabBlock block={block} />;
    case "homework":
      return <HomeworkBlock block={block} />;

    case "quiz":
      return <Quiz block={block} />;
  }
}

export default function Home() {
  const [activeId, setActiveId] = useState(lessons[0].id);
  const [notice, setNotice] = useState("");

  const savedProgress = useSyncExternalStore(
    subscribeToProgress,
    readProgress,
    readServerProgress,
  );

  const completed = decodeProgress(savedProgress);
  const lesson = lessons.find((item) => item.id === activeId) ?? lessons[0];
  const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);
  const isRead = completed.includes(lesson.id);
  const earnedXp = lessons.reduce(
    (total, item) => total + (completed.includes(item.id) ? item.xp : 0),
    0,
  );

  function markAsRead() {
    const updated = [...new Set([...completed, lesson.id])];

    try {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event(PROGRESS_EVENT));
      setNotice(`Nice work. ${lesson.xp} reading XP added.`);
    } catch {
      setNotice(
        "Your browser could not save progress. Allow site storage and try again.",
      );
    }
  }

  return (
    <div className="app-shell">
      <a href="#lesson" className="skip-link">Skip to lesson</a>

      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Cyber Box home">
          <span className="brand-icon">
            <Terminal size={22} aria-hidden="true" />
          </span>
          <span>Cipher<span className="accent">Lab</span></span>
        </Link>

        <div className="workspace-label">YOUR LEARNING SPACE</div>
        <div className="sidebar-section">
          <BookOpen size={17} aria-hidden="true" />
          Learning path
        </div>

        <nav className="lesson-navigation" aria-label="Lessons">
          {lessons.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`lesson-link ${lesson.id === item.id ? "active" : ""}`}
              aria-current={lesson.id === item.id ? "step" : undefined}
              onClick={() => {
                setActiveId(item.id);
                setNotice("");
              }}
            >
              <span className="lesson-number">
                {completed.includes(item.id)
                  ? <Check size={15} aria-hidden="true" />
                  : String(index + 1).padStart(2, "0")}
              </span>
              <span>{item.title}</span>
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          ))}
        </nav>

        <div className="sidebar-progress">
          <div className="icon-label">
            <Trophy size={18} aria-hidden="true" />
            <strong>{earnedXp} XP collected</strong>
          </div>
          <progress
            value={completed.length}
            max={lessons.length}
            aria-label="Lessons marked as read"
          />
          <p>{completed.length} of {lessons.length} lessons read</p>
          <small>Saved in this browser.</small>
        </div>

        <div className="sidebar-footer">
          <span className="avatar">Y</span>
          <div>
            <strong>Your little cyber corner</strong>
            <small>One discovery at a time.</small>
          </div>
        </div>
      </aside>

      <main id="lesson" className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Learning path
            <ChevronRight size={14} aria-hidden="true" />
            <span>{lesson.category}</span>
          </div>
          <span className="pill">SELF-PACED</span>
        </header>

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
            <div className="hero-terminal"><Terminal size={46} /></div>
            <span className="orbit-dot" />
          </div>
        </section>

        <div className="content-layout">
          <article className="lesson-content" aria-label={lesson.title}>
            {lesson.blocks.map((block) => (
              <LessonBlock key={`${lesson.id}:${block.id}`} block={block} />
            ))}

            <footer className="completion-card">
              <div>
                <h3>{isRead ? "Another small win." : "Ready to call this a win?"}</h3>
                <p>Mark your reading progress when you feel comfortable.</p>
              </div>
              <button
                type="button"
                className="primary-button"
                disabled={isRead}
                onClick={markAsRead}
              >
                {isRead ? <Check size={17} /> : <ArrowUpRight size={17} />}
                {isRead ? "Lesson read" : "Mark as read"}
              </button>
              <p className="save-notice" role="status">{notice}</p>
            </footer>
          </article>

          <aside className="mission-card">
            <span className="mission-icon">
              <FlaskConical size={22} aria-hidden="true" />
            </span>
            <span className="eyebrow">THE GAME PLAN</span>
            <h2>Small steps.<br />Real skills.</h2>
            <p>By the end of this chapter, you will be able to:</p>
            <ol>
              {lesson.objectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ol>
            <div className="mission-note">
              No timer. No pressure.<br />
              You can come back as often as you like.
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
