"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  FlaskConical,
  Terminal,
  Trophy,
  Box,
  LayoutDashboard
} from "lucide-react";
import { type Lesson, type ContentBlock } from "@/content/lessons";
import LabTerminal from "@/components/LabTerminal";
import type { Progress } from "@/lib/progress-types";
import { markReadingComplete, completeLab, importReadingProgress } from "@/app/actions/progress";

type ReadingLesson = Omit<Lesson, "blocks"> & {
  blocks: Exclude<ContentBlock, { type: "homework" }>[];
};

function Quiz({ block }: { block: Extract<ContentBlock, { type: "quiz" }> }) {
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

function LabBlock({ 
  lessonId, 
  block, 
  isCompleted 
}: { 
  lessonId: string, 
  block: Extract<ContentBlock, { type: "lab" }>, 
  isCompleted: boolean 
}) {
  const [retrying, setRetrying] = useState(false);
  const [flagInput, setFlagInput] = useState("");
  const [error, setError] = useState(false);
  const [submitting, startSubmitting] = useTransition();

  function submitFlag(e: React.FormEvent) {
    e.preventDefault();
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
      <section className="lab-card" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#152119", borderColor: "#344738" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Check size={20} color="#b8f777" />
          <strong style={{ color: "#b8f777" }}>Practice Completed</strong>
        </div>
        <button className="secondary-button" onClick={() => setRetrying(true)} style={{ fontSize: "12px", padding: "4px 10px", height: "auto" }}>
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
              disabled={submitting}
              style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", border: error ? "1px solid #ff8b8b" : "1px solid var(--border)", background: "#090f13", color: "var(--text)", outline: "none" }}
            />
            <button type="submit" disabled={submitting} className="primary-button" style={{ height: "auto", padding: "8px 16px" }}>
              {submitting ? "Checking..." : "Submit"}
            </button>
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

function LessonBlock({ 
  lessonId, 
  block, 
  progress 
}: { 
  lessonId: string, 
  block: ContentBlock,
  progress: Progress
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
      const isCompleted = progress.labIds.includes(`${lessonId}:${block.id}`);
      return <LabBlock lessonId={lessonId} block={block} isCompleted={isCompleted} />;
    case "quiz":
      return <Quiz block={block} />;
    case "homework":
      return null;
  }
}

export default function LearningPage({
  lessons,
  progress,
}: {
  lessons: ReadingLesson[];
  progress: Progress;
}) {
  const [activeId, setActiveId] = useState(lessons[0].id);
  const [notice, setNotice] = useState("");
  const [saving, startSaving] = useTransition();

  const completed = progress.readingIds;
  const earnedXp = progress.totalXp;
  
  const lesson = lessons.find((item) => item.id === activeId) ?? lessons[0];
  const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);
  const isRead = completed.includes(lesson.id);

  function markAsRead() {
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
    <div className="app-shell workspace-shell">
      <a href="#lesson" className="skip-link">Skip to lesson</a>

      <aside className="sidebar">
        <Link className="brand" href="/dashboard" aria-label="Cyber Box home">
          <span className="brand-icon">
            <Box size={22} aria-hidden="true" />
          </span>
          <span>Cyber <span className="accent">Box</span></span>
        </Link>
        
        <Link href="/dashboard" className="lesson-link" style={{ marginBottom: "1rem", opacity: 0.8 }}>
          <LayoutDashboard size={17} aria-hidden="true" />
          <span>Back to Dashboard</span>
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
          <small>Saved to your account.</small>
          
          <button 
            type="button" 
            onClick={importOldReading} 
            className="secondary-button" 
            style={{ marginTop: "1rem", width: "100%" }}
          >
            Import old progress
          </button>
        </div>

        <div className="sidebar-footer">
          <span className="avatar">R</span>
          <div>
            <strong>Ronak</strong>
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <LessonBlock key={`${lesson.id}:${block.id}`} lessonId={lesson.id} block={block as any} progress={progress} />
            ))}

            <footer className="completion-card">
              <div>
                <h3>{isRead ? "Another small win." : "Ready to call this a win?"}</h3>
                <p>Mark your reading progress when you feel comfortable.</p>
              </div>
              <button
                type="button"
                className="primary-button"
                disabled={isRead || saving}
                onClick={markAsRead}
              >
                {isRead ? <Check size={17} /> : <ArrowUpRight size={17} />}
                {isRead ? "Lesson read" : (saving ? "Saving..." : "Mark as read")}
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
