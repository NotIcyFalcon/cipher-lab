# Batch 3 Prompt

Since you are using the same AI session, it already remembers the project, the paths, and the new UI style. You just need to give it the homework files and the new instructions.

## Copy and paste this single prompt:

```text
Batch 2 was perfect! Now let's move on to **Batch 3: Homework Restructuring**.

Here are the current files related to the homework functionality that you need to modify:

--- BEGIN FILE: src/app/homework/page.tsx ---
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { paths } from "@/content/paths";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import { homeworkChapters } from "@/server/homework-catalog";

type SearchParams = Record<string, string | string[] | undefined>;

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

  const chapters = selectedPath
    ? homeworkChapters.filter((chapter) =>
        selectedPath.lessonIds.includes(chapter.id),
      )
    : homeworkChapters;

  return (
    <>
      <header className="topbar">
        <div className="breadcrumb">
          <span>Homework</span>
          {selectedPath && <span> / {selectedPath.title}</span>}
        </div>
      </header>
      <header className="hero">
        <div>
          <span className="eyebrow accent">PRACTICE YOUR SKILLS</span>
          <h1>{selectedPath ? `${selectedPath.title} homework` : "Homework"}</h1>
          <p>
            Choose a chapter, submit your Bash scripts, and improve your best
            score.
          </p>
        </div>
      </header>

      {selectedPath && (
        <p>
          <Link href="/homework" className="secondary-button">
            View all homework
          </Link>
        </p>
      )}

      <ul className="path-grid">
        {chapters.map((chapter) => {
          const earned = chapter.questions.reduce(
            (sum, question) =>
              sum + (progress.homeworkBest[question.homeworkId] ?? 0),
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

          return (
            <li key={chapter.id}>
              <Link
                href={`/homework/${encodeURIComponent(chapter.id)}`}
                className="path-card homework-path-card"
              >
                <div className="path-title">
                  <h2>{chapter.title}</h2>
                  <ArrowUpRight size={20} aria-hidden="true" />
                </div>
                <p>{chapter.description}</p>
                <div className="path-tags">
                  <span className="pill">
                    {chapter.questions.length} questions
                  </span>
                  <span className="pill">{solved} solved</span>
                  <span className="pill">
                    {earned} / {available} XP
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {chapters.length === 0 && (
        <p>No homework is available for this path yet.</p>
      )}
    </>
  );
}

--- END FILE: src/app/homework/page.tsx ---

--- BEGIN FILE: src/app/homework/[chapterId]/page.tsx ---
import Link from "next/link";
import { notFound } from "next/navigation";
import HomeworkQuestionCard from "@/components/HomeworkQuestionCard";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import {
  homeworkChapters,
  publicQuestion,
} from "@/server/homework-catalog";
import { ChevronRight } from "lucide-react";

export default async function ChapterHomeworkPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const userId = await requireRonakId();
  const { chapterId } = await params;

  const chapter = homeworkChapters.find((item) => item.id === chapterId);
  if (!chapter) notFound();

  const progress = getProgress(userId);

  return (
    <>
      <header className="topbar">
        <div className="breadcrumb">
          <Link href="/homework">Homework</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span>{chapter.title}</span>
        </div>
      </header>
      <header className="hero">
        <div>
          <Link href="/homework" className="eyebrow accent" style={{display: "block", marginBottom: "10px"}}>
            ← ALL HOMEWORK
          </Link>
          <h1>{chapter.title}</h1>
          <p>{chapter.description}</p>
        </div>
      </header>

      <div className="homework-list">
        {chapter.questions.map((question) => (
          <HomeworkQuestionCard
            key={question.homeworkId}
            question={publicQuestion(question)}
            bestXp={progress.homeworkBest[question.homeworkId] ?? 0}
          />
        ))}

        {chapter.questions.length === 0 && (
          <p>No homework questions have been added to this chapter yet.</p>
        )}
      </div>
    </>
  );
}

--- END FILE: src/app/homework/[chapterId]/page.tsx ---

--- BEGIN FILE: src/components/HomeworkQuestionCard.tsx ---
"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  gradeHomework,
  listHomeworkSubmissions,
  readHomeworkSubmission,
} from "@/app/actions/grade-homework";
import type {
  HistoryPage,
  HomeworkQuestion,
  Submission,
} from "@/lib/progress-types";

export default function HomeworkQuestionCard({
  question,
  bestXp,
}: {
  question: HomeworkQuestion;
  bestXp: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryPage | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);

  function run(work: () => Promise<void>) {
    setError("");

    startTransition(async () => {
      try {
        await work();
      } catch {
        setError("The request could not finish. Please try again.");
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    formData.set("homeworkId", question.homeworkId);

    run(async () => {
      const reply = await gradeHomework(formData);

      if (!reply.ok) {
        setError(reply.error);
        return;
      }

      setSelected(reply.submission);

      if (history !== null) {
        setHistory(
          await listHomeworkSubmissions(question.homeworkId),
        );
      }
    });
  }

  function loadHistory(reset: boolean) {
    run(async () => {
      const cursor = reset ? undefined : history?.nextCursor ?? undefined;

      const page = await listHomeworkSubmissions(
        question.homeworkId,
        cursor,
      );

      setHistory((previous) => ({
        items:
          reset || !previous
            ? page.items
            : [...previous.items, ...page.items],
        nextCursor: page.nextCursor,
      }));
    });
  }

  function openSubmission(id: number) {
    run(async () => {
      setSelected(await readHomeworkSubmission(id));
    });
  }

  return (
    <details className="homework-question">
      <summary className="homework-question-heading">
        <span>
          <strong>{question.title}</strong>
          <small>{question.totalTests} tests</small>
        </span>

        <span className="homework-best">
          Best: {bestXp} / {question.totalPoints} XP
        </span>
      </summary>

      <div className="homework-question-body">
        <p className="homework-objective">{question.objective}</p>

        <form onSubmit={submit} className="homework-upload">
          <label htmlFor={`script-${question.homeworkId}`}>
            Upload your Bash script
          </label>

          <input
            id={`script-${question.homeworkId}`}
            name="file"
            type="file"
            accept=".sh"
            required
            disabled={pending}
          />

          <small>Choose a UTF-8 .sh file, up to 64 KB.</small>

          <button
            type="submit"
            className="primary-button"
            disabled={pending}
          >
            {pending ? "Working…" : "Submit for grading"}
          </button>
        </form>

        <p className="homework-error" role="alert">
          {error}
        </p>

        <div className="homework-history">
          <button
            type="button"
            className="secondary-button"
            disabled={pending}
            onClick={() => loadHistory(true)}
          >
            {history === null
              ? "View submission history"
              : "Refresh submission history"}
          </button>

          {history !== null && (
            <>
              {history.items.length === 0 ? (
                <p>No submissions yet.</p>
              ) : (
                <ul className="submission-list">
                  {history.items.map((submission) => (
                    <li key={submission.id}>
                      <button
                        type="button"
                        className="submission-row"
                        disabled={pending}
                        aria-pressed={selected?.id === submission.id}
                        onClick={() => openSubmission(submission.id)}
                      >
                        <span>
                          #{submission.id}
                          <small>
                            {new Date(
                              submission.createdAt,
                            ).toLocaleString()}
                          </small>
                        </span>

                        <span>
                          {submission.status === "graded"
                            ? `${submission.awardedXp} / ${submission.totalPoints} XP`
                            : submission.status === "pending"
                              ? "Pending"
                              : "Grading error"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {history.nextCursor !== null && (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={pending}
                  onClick={() => loadHistory(false)}
                >
                  Load older submissions
                </button>
              )}
            </>
          )}
        </div>

        {selected && (
          <section className="submission-detail" aria-live="polite">
            <h3>Submission #{selected.id}</h3>

            <p>
              {new Date(selected.createdAt).toLocaleString()}
              {" · "}
              {selected.filename}
            </p>

            {selected.status === "graded" && (
              <p className="accent">
                {selected.awardedXp} / {selected.totalPoints} XP
                {" · "}
                {selected.passedTests} / {selected.totalTests} tests passed
              </p>
            )}

            {selected.status === "pending" && (
              <p>Grading has not finished. Refresh history to check again.</p>
            )}

            {selected.error && (
              <p className="homework-error">{selected.error}</p>
            )}

            <details>
              <summary>View submitted code</summary>
              <pre className="submission-code">
                <code>{selected.code}</code>
              </pre>
            </details>

            <ul className="homework-results">
              {selected.results.map((result, index) => (
                <li key={index} className="submission-row" style={{ display: "block", background: result.passed ? "rgba(184, 247, 119, 0.05)" : "rgba(255, 139, 139, 0.05)" }}>
                  <details style={{ width: "100%" }}>
                    <summary style={{ display: "flex", gap: "10px", alignItems: "center", cursor: "pointer", fontWeight: 600 }}>
                      <span className={result.passed ? "test-pass" : "test-fail"}>
                        {result.passed ? "PASS" : "FAIL"}
                      </span>
                      <span>{" · "} {result.name}</span>
                    </summary>

                    <div style={{ marginTop: "16px" }}>
                      <p style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px" }}>Expected output</p>
                      <pre style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px", marginTop: "6px" }}>
                        <code>{result.expectedOutput || "(empty)"}</code>
                      </pre>

                      <p style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px", marginTop: "12px" }}>Your output</p>
                      <pre style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px", marginTop: "6px" }}>
                        <code>{result.actualOutput || "(empty)"}</code>
                      </pre>

                      {typeof result.error === "string" && (
                        <p className="homework-error" style={{ marginTop: "12px" }}>{result.error}</p>
                      )}

                      {typeof result.stderr === "string" && result.stderr !== "" && (
                        <>
                          <p style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px", marginTop: "12px" }}>Standard error</p>
                          <pre style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px", marginTop: "6px", color: "#ff8b8b" }}>
                            <code>{result.stderr}</code>
                          </pre>
                        </>
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </details>
  );
}

--- END FILE: src/components/HomeworkQuestionCard.tsx ---

--- BEGIN FILE: src/server/homework-catalog.ts ---
import "server-only";
import { lessons, type ContentBlock } from "@/content/lessons";
import type { HomeworkQuestion } from "@/lib/progress-types";

type HomeworkBlock = Extract<ContentBlock, { type: "homework" }>;

export type HomeworkDefinition = HomeworkBlock & {
  chapterId: string;
};

export const homeworkChapters = lessons
  .map((lesson) => {
    const questions = lesson.blocks
      .filter((block): block is HomeworkBlock => block.type === "homework")
      .map((block) => ({
        ...block,
        totalTests: block.testCases.length,
      }));

    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      questions,
    };
  })
  .filter((chapter) => chapter.questions.length > 0);

const questionsById = new Map<string, HomeworkDefinition>();

for (const chapter of homeworkChapters) {
  for (const question of chapter.questions) {
    if (questionsById.has(question.homeworkId)) {
      throw new Error(`Duplicate homeworkId: ${question.homeworkId}`);
    }

    if (
      !Number.isInteger(question.totalPoints) ||
      question.totalPoints <= 0 ||
      question.testCases.length === 0 ||
      question.testCases.length > 100
    ) {
      throw new Error(`Invalid homework definition: ${question.homeworkId}`);
    }

    questionsById.set(question.homeworkId, {
      ...question,
      chapterId: chapter.id,
    });
  }
}

export function findHomework(homeworkId: string) {
  return questionsById.get(homeworkId);
}

export function publicQuestion(question: HomeworkBlock): HomeworkQuestion {
  return {
    homeworkId: question.homeworkId,
    title: question.title || "Assignment",
    objective: question.objective || "Complete the assignment script.",
    totalPoints: question.totalPoints,
    totalTests: question.testCases.length,
  };
}

--- END FILE: src/server/homework-catalog.ts ---

### 📦 BATCH 3: Homework Restructuring (Locked Logic & Grader UI)
1. **Homework Catalog Logic (`src/app/homework/page.tsx` & `src/server/homework-catalog.ts`)**
   - Right now, all homework is open to everyone immediately.
   - Implement **Locked Logic**: A user should NOT be able to click on or access a homework chapter unless they have completed the **reading** for that chapter's lesson (using `progress.readingIds`).
   - Show a clear "Locked" state in the UI for chapters they haven't read yet (e.g., greyed out, lock icon, "Read chapter to unlock").
   - Redesign the list of homework chapters to match the premium Dashboard UI (using the existing `batch-two.css` styles or adding a new `src/app/batch-three.css`).
2. **Homework Grader UI (`src/app/homework/[chapterId]/page.tsx` & `src/components/HomeworkQuestionCard.tsx`)**
   - The current `HomeworkQuestionCard` looks very basic (just a details/summary HTML element).
   - Redesign the grader UI to feel like a premium code-upload terminal or an interactive mission briefing.
   - Improve the display of the test results (Expected vs. Actual Output). It should look like a clean, color-coded terminal log (Green for Pass, Red for Fail) rather than basic HTML pre tags.
   - Show a prominent "Perfect Score" or "Completed" badge if `bestXp` equals `question.totalPoints`.
   - If you add new styles, please put them in a new file `src/app/batch-three.css` and import it.

Provide the complete updated code for the files you modify, and the new `batch-three.css`. Do NOT proceed to Batch 4 yet.
```
