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
