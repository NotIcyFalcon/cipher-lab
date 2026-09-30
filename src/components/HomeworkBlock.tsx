"use client";

import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { Check, X } from "lucide-react";
import type { HomeworkContentBlock } from "@/content/lessons";
import { gradeHomeworkScript } from "@/app/actions/grade-homework";
import type { HomeworkGrade } from "@/lib/homework-types";
import {
  getHomeworkBestXp,
  readServerHomeworkXp,
  saveHomeworkProgress,
  subscribeToHomeworkProgress,
} from "@/lib/homework-progress";

export default function HomeworkBlock({
  block,
}: {
  block: HomeworkContentBlock;
}) {
  const inputId = useId();
  const busyRef = useRef(false);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [result, setResult] = useState<HomeworkGrade | null>(null);

  const bestXp = useSyncExternalStore(
    subscribeToHomeworkProgress,
    () => getHomeworkBestXp(block.homeworkId),
    readServerHomeworkXp,
  );

  async function submitHomework(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busyRef.current) return;

    setError("");
    setSaveNotice("");
    setResult(null);

    if (!file || !file.name.toLowerCase().endsWith(".sh")) {
      setError("Choose a .sh file.");
      return;
    }

    if (file.size === 0 || file.size > 32 * 1024) {
      setError("Choose a nonempty script no larger than 32 KiB.");
      return;
    }

    busyRef.current = true;
    setBusy(true);

    try {
      const bytes = await file.arrayBuffer();
      let scriptContent: string;

      try {
        scriptContent = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        setError("Save your script as UTF-8 text and try again.");
        return;
      }

      const response = await gradeHomeworkScript(
        scriptContent,
        block.homeworkId,
      );

      if (!response.ok) {
        setError(response.error);
        return;
      }

      setResult(response);

      try {
        saveHomeworkProgress(response.homeworkId, response.passedTests);
        setSaveNotice("Your best score is saved in this browser.");
      } catch {
        setSaveNotice(
          "Grading finished, but this browser could not save your progress.",
        );
      }
    } catch {
      setError("Submission failed. Please try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="lab-card homework-card">
      <div className="panel-heading">
        <span>{block.title}</span>
        <span className="eyebrow">UP TO {block.totalPoints} XP</span>
      </div>

      <div className="lab-instructions">
        <span className="eyebrow">BASH HOMEWORK</span>
        <p>{block.objective}</p>

        <p className="homework-best">
          Best score: <strong>{bestXp} / {block.totalPoints} XP</strong>
        </p>

        <form
          className="homework-form"
          onSubmit={submitHomework}
          aria-busy={busy}
        >
          <label htmlFor={inputId}>Your Bash script</label>

          <input
            id={inputId}
            type="file"
            accept=".sh"
            disabled={busy}
            aria-describedby={`${inputId}-help`}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError("");
              setSaveNotice("");
              setResult(null);
            }}
          />

          <small id={`${inputId}-help`}>
            UTF-8 .sh file, up to 32 KiB.
          </small>

          <button
            type="submit"
            className="primary-button"
            disabled={busy || !file}
          >
            {busy ? "Grading homework…" : "Submit Homework"}
          </button>
        </form>

        {error && (
          <p className="homework-error" role="alert">
            {error}
          </p>
        )}

        <div aria-live="polite" aria-atomic="true">
          {result && (
            <p className="homework-summary">
              {result.passedTests} of {result.totalTests} tests passed ·{" "}
              <strong>
                {result.awardedXp} / {result.totalPoints} XP
              </strong>
            </p>
          )}

          {saveNotice && <p>{saveNotice}</p>}
        </div>

        {result && (
          <>
            {result.scriptExitCode !== 0 && (
              <p className="homework-error">
                Your script exited with code {result.scriptExitCode}.
                Fix the script error before resubmitting.
              </p>
            )}

            {result.scriptStderr && (
              <details className="homework-diagnostics">
                <summary>Script diagnostics</summary>
                <pre>{result.scriptStderr}</pre>
              </details>
            )}

            <ul className="homework-results">
              {result.results.map((test) => (
                <li
                  key={test.id}
                  className="homework-test"
                  data-passed={test.passed}
                >
                  <div className="homework-test-heading">
                    {test.passed ? (
                      <Check size={18} aria-hidden="true" />
                    ) : (
                      <X size={18} aria-hidden="true" />
                    )}

                    <span>
                      <strong>{test.passed ? "Passed" : "Failed"}</strong>
                      {" · "}
                      {test.title}
                    </span>

                    <small>
                      {test.points} / {test.maxPoints} XP
                    </small>
                  </div>

                  {!test.passed && (
                    <details>
                      <summary>View result</summary>
                      <p>Exit code: {test.exitCode}</p>
                      <pre>
                        {test.actualOutput || "(No stdout)"}
                        {test.stderr ? `\n\nstderr:\n${test.stderr}` : ""}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
