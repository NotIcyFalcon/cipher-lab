"use client";

import {
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Code2,
  FileCode2,
  FlaskConical,
  History,
  LoaderCircle,
  RefreshCw,
  Terminal,
  Trophy,
  Upload,
  XCircle,
} from "lucide-react";

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

import "@/app/batch-three.css";

type Operation = "grade" | "history" | "submission";

function OutputPanel({
  title,
  output,
  tone,
}: {
  title: string;
  output: string | null | undefined;
  tone?: "pass" | "fail";
}) {
  const empty = output === "" || output === null || output === undefined;

  return (
    <div className={`hw-output-panel${tone ? ` is-${tone}` : ""}`}>
      <div className="hw-output-heading">
        <Terminal size={13} aria-hidden="true" />
        <span>{title}</span>
      </div>

      <pre className="hw-output-code">
        <code>
          {empty ? (
            <span className="hw-output-empty">(empty output)</span>
          ) : (
            output
          )}
        </code>
      </pre>
    </div>
  );
}

export default function HomeworkQuestionCard({
  question,
  bestXp,
  questionNumber = 1,
}: {
  question: HomeworkQuestion;
  bestXp: number;
  questionNumber?: number;
}) {
  const [pending, startTransition] = useTransition();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [history, setHistory] = useState<HistoryPage | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [sessionBest, setSessionBest] = useState(0);

  const busyRef = useRef(false);
  const id = useId();

  const inputId = `${id}-script`;
  const helpId = `${id}-upload-help`;
  const errorId = `${id}-error`;
  const titleId = `${id}-title`;
  const resultTitleId = `${id}-result-title`;

  const busy = pending || operation !== null;

  // A successful submission can update the displayed best immediately.
  // Server props remain authoritative for previously saved progress.
  // A retry or a historical result never reduces the displayed best.
  const best = Math.min(
    question.totalPoints,
    Math.max(0, bestXp, sessionBest),
  );
  const perfect = best === question.totalPoints;

  function run(kind: Operation, work: () => Promise<void>) {
    if (busyRef.current) return;

    busyRef.current = true;
    setError("");
    setOperation(kind);

    startTransition(async () => {
      try {
        await work();
      } catch {
        setError("The request could not finish. Please try again.");
      } finally {
        busyRef.current = false;
        setOperation(null);
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;

    const formData = new FormData(event.currentTarget);
    formData.set("homeworkId", question.homeworkId);

    run("grade", async () => {
      const reply = await gradeHomework(formData);

      if (!reply.ok) {
        setError(reply.error);
        return;
      }

      setSelected(reply.submission);

      if (reply.submission.status === "graded") {
        const awardedXp = reply.submission.awardedXp;
        setSessionBest((previous) => Math.max(previous, awardedXp));
      }

      if (history !== null) {
        setHistory(await listHomeworkSubmissions(question.homeworkId));
      }
    });
  }

  function loadHistory(reset: boolean) {
    run("history", async () => {
      const cursor = reset ? undefined : history?.nextCursor ?? undefined;
      const page = await listHomeworkSubmissions(question.homeworkId, cursor);

      setHistory((previous) => ({
        items:
          reset || !previous
            ? page.items
            : [...previous.items, ...page.items],
        nextCursor: page.nextCursor,
      }));
    });
  }

  function openSubmission(submissionId: number) {
    run("submission", async () => {
      setSelected(await readHomeworkSubmission(submissionId));
    });
  }

  const selectedPerfect =
    selected?.status === "graded" &&
    selected.awardedXp === selected.totalPoints;

  const selectedState = !selected
    ? ""
    : selected.status === "graded"
      ? selectedPerfect
        ? "is-pass"
        : "is-review"
      : selected.status === "pending"
        ? "is-pending"
        : "is-fail";

  return (
    <details className="hw-question" data-complete={perfect}>
      <summary className="hw-question-summary">
        <span className="hw-question-number" aria-hidden="true">
          {perfect ? (
            <Check size={19} />
          ) : (
            String(questionNumber).padStart(2, "0")
          )}
        </span>

        <span className="hw-question-copy">
          <span className="dashboard-kicker">
            MISSION {String(questionNumber).padStart(2, "0")}
          </span>
          <strong id={titleId}>{question.title}</strong>
          <span className="hw-question-meta">
            <FlaskConical size={12} aria-hidden="true" />
            {question.totalTests}{" "}
            {question.totalTests === 1 ? "test" : "tests"}
            <span aria-hidden="true">·</span>
            {question.totalPoints} available XP
          </span>
        </span>

        <span className="hw-question-score">
          {perfect && (
            <span className="hw-perfect-badge">
              <Trophy size={12} aria-hidden="true" />
              Perfect score
            </span>
          )}
          <span className="hw-best-score">
            Best <strong>{best}</strong>
            <span>/ {question.totalPoints} XP</span>
          </span>
        </span>

        <ChevronDown
          className="hw-question-chevron"
          size={19}
          aria-hidden="true"
        />
      </summary>

      <div className="hw-question-body">
        <section className="hw-briefing" aria-labelledby={`${id}-briefing`}>
          <div className="hw-subheading">
            <span className="hw-small-icon" aria-hidden="true">
              <FileCode2 size={17} />
            </span>
            <div>
              <span className="dashboard-kicker">MISSION BRIEFING</span>
              <h3 id={`${id}-briefing`}>What you need to build</h3>
            </div>
          </div>
          <p className="hw-objective">{question.objective}</p>
        </section>

        <section className="hw-upload-terminal" aria-labelledby={`${id}-upload`}>
          <header className="hw-terminal-heading">
            <span className="hw-terminal-icon" aria-hidden="true">
              <Terminal size={19} />
            </span>
            <div>
              <span className="hw-terminal-kicker">SCRIPT WORKSPACE</span>
              <h3 id={`${id}-upload`}>Submit your solution</h3>
            </div>
            <span className="hw-language-badge">BASH · .SH</span>
          </header>

          <form
            onSubmit={submit}
            className="hw-upload-form"
            aria-labelledby={titleId}
            aria-busy={operation === "grade"}
          >
            <div className="hw-upload-zone">
              <Upload size={25} aria-hidden="true" />

              <label htmlFor={inputId}>Choose your Bash script</label>
              <p>Upload the file you want the grader to run.</p>

              <input
                id={inputId}
                name="file"
                type="file"
                accept=".sh"
                required
                disabled={busy}
                aria-describedby={helpId}
                onChange={(event) => {
                  setFilename(event.target.files?.[0]?.name ?? "");
                  setError("");
                }}
              />

              <small id={helpId}>UTF-8 .sh file · Maximum size 64 KB</small>
            </div>

            <div className="hw-upload-actions">
              <span className="hw-file-status">
                <FileCode2 size={14} aria-hidden="true" />
                <span>{filename || "No script selected"}</span>
              </span>

              <button
                type="submit"
                className="primary-button"
                disabled={busy || !filename}
              >
                {operation === "grade" ? (
                  <LoaderCircle
                    size={16}
                    className="hw-spinner"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowRight size={16} aria-hidden="true" />
                )}
                {operation === "grade" ? "Grading script…" : "Submit for grading"}
              </button>
            </div>
          </form>

          <div className="hw-terminal-footnote">
            <Trophy size={14} aria-hidden="true" />
            <span>
              {perfect
                ? "Perfect score saved. Reattempts do not award duplicate XP."
                : "Only improvements to your best score add homework XP."}
            </span>
          </div>
        </section>

        <p className="hw-operation-status" role="status">
          {operation === "grade"
            ? "Your script is being graded."
            : operation === "history"
              ? "Loading submission history."
              : operation === "submission"
                ? "Loading the selected submission."
                : ""}
        </p>

        <div id={errorId} className="hw-request-error" role="alert">
          {error && (
            <>
              <AlertCircle size={17} aria-hidden="true" />
              <p>{error}</p>
            </>
          )}
        </div>

        <section
          className="hw-history"
          aria-labelledby={`${id}-history-title`}
        >
          <div className="hw-section-heading">
            <div>
              <span className="dashboard-kicker">YOUR ITERATIONS</span>
              <h3 id={`${id}-history-title`}>
                <History size={17} aria-hidden="true" />
                Submission history
              </h3>
            </div>

            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => loadHistory(true)}
            >
              {operation === "history" ? (
                <LoaderCircle
                  size={14}
                  className="hw-spinner"
                  aria-hidden="true"
                />
              ) : (
                <RefreshCw size={14} aria-hidden="true" />
              )}
              {history === null ? "Load history" : "Refresh history"}
            </button>
          </div>

          {history === null ? (
            <p className="hw-section-description">
              Load previous attempts to compare your solutions and feedback.
            </p>
          ) : history.items.length === 0 ? (
            <div className="hw-history-empty">
              <History size={21} aria-hidden="true" />
              <p>No submissions yet. Your first attempt starts the story.</p>
            </div>
          ) : (
            <ul className="hw-history-list">
              {history.items.map((submission) => {
                const graded = submission.status === "graded";
                const complete =
                  graded &&
                  submission.awardedXp === submission.totalPoints;
                const isPending = submission.status === "pending";

                return (
                  <li key={submission.id}>
                    <button
                      type="button"
                      className="hw-history-row"
                      disabled={busy}
                      aria-pressed={selected?.id === submission.id}
                      onClick={() => openSubmission(submission.id)}
                    >
                      <span
                        className={`hw-history-icon${
                          complete
                            ? " is-pass"
                            : graded
                              ? " is-review"
                              : isPending
                                ? ""
                                : " is-fail"
                        }`}
                        aria-hidden="true"
                      >
                        {complete ? (
                          <CheckCircle2 size={17} />
                        ) : graded ? (
                          <FileCode2 size={17} />
                        ) : isPending ? (
                          <Clock3 size={17} />
                        ) : (
                          <AlertCircle size={17} />
                        )}
                      </span>

                      <span className="hw-history-copy">
                        <strong>Submission #{submission.id}</strong>
                        <time dateTime={new Date(submission.createdAt).toISOString()}>
                          {new Date(submission.createdAt).toLocaleString()}
                        </time>
                      </span>

                      <span className="hw-history-score">
                        {graded
                          ? `${submission.awardedXp} / ${submission.totalPoints} XP`
                          : isPending
                            ? "Pending"
                            : "Grading error"}
                      </span>

                      <ArrowRight
                        className="hw-history-arrow"
                        size={15}
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {history !== null && history.nextCursor !== null && (
            <button
              type="button"
              className="secondary-button hw-load-older"
              disabled={busy}
              onClick={() => loadHistory(false)}
            >
              <ArrowDown size={14} aria-hidden="true" />
              Load older submissions
            </button>
          )}
        </section>

        {selected && (
          <section
            className={`hw-submission ${selectedState}`}
            aria-labelledby={resultTitleId}
            aria-live="polite"
          >
            <header className="hw-result-heading">
              <span className="hw-result-icon" aria-hidden="true">
                {selectedPerfect ? (
                  <CheckCircle2 size={23} />
                ) : selected.status === "pending" ? (
                  <Clock3 size={23} />
                ) : selected.status === "graded" ? (
                  <FlaskConical size={23} />
                ) : (
                  <AlertCircle size={23} />
                )}
              </span>

              <div className="hw-result-copy">
                <span className="dashboard-kicker">GRADER REPORT</span>
                <h3 id={resultTitleId}>Submission #{selected.id}</h3>
                <p>
                  <time dateTime={new Date(selected.createdAt).toISOString()}>
                    {new Date(selected.createdAt).toLocaleString()}
                  </time>
                  {" · "}
                  {selected.filename}
                </p>
              </div>

              <span className={`hw-result-badge ${selectedState}`}>
                {selectedPerfect
                  ? "Perfect score"
                  : selected.status === "graded"
                    ? "Grading complete"
                    : selected.status === "pending"
                      ? "Pending"
                      : "Grading error"}
              </span>
            </header>

            {selected.status === "graded" && (
              <>
                <dl className="hw-result-stats">
                  <div>
                    <dt>Submission score</dt>
                    <dd>
                      {selected.awardedXp}
                      <span> / {selected.totalPoints} XP</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Tests passed</dt>
                    <dd>
                      {selected.passedTests}
                      <span> / {selected.totalTests}</span>
                    </dd>
                  </div>
                </dl>
                <p className="hw-score-note">
                  This report shows the selected attempt. Your saved best score
                  is shown at the top of the mission.
                </p>
              </>
            )}

            {selected.status === "pending" && (
              <p className="hw-result-message">
                Grading has not finished. Refresh history, then reopen this
                submission to check its latest result.
              </p>
            )}

            {selected.error ? (
              <p className="hw-result-error">{selected.error}</p>
            ) : selected.status !== "graded" &&
              selected.status !== "pending" ? (
              <p className="hw-result-error">
                Grading could not finish for this submission. Please try again.
              </p>
            ) : null}

            <details className="hw-code-disclosure">
              <summary>
                <Code2 size={16} aria-hidden="true" />
                <span>View submitted script</span>
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <pre className="hw-source-code">
                <code>{selected.code}</code>
              </pre>
            </details>

            {selected.results.length > 0 && (
              <div className="hw-test-report">
                <div className="hw-test-report-heading">
                  <h4>Test-by-test results</h4>
                  <span>Expand a check to inspect its output.</span>
                </div>

                <ul className="hw-test-list">
                  {selected.results.map((result, index) => (
                    <li key={`${selected.id}:${index}`}>
                      <details
                        className="hw-test"
                        data-passed={result.passed}
                      >
                        <summary className="hw-test-summary">
                          <span className="hw-test-status">
                            {result.passed ? (
                              <CheckCircle2 size={16} aria-hidden="true" />
                            ) : (
                              <XCircle size={16} aria-hidden="true" />
                            )}
                            {result.passed ? "PASS" : "FAIL"}
                          </span>

                          <span className="hw-test-name">{result.name}</span>
                          <ChevronDown
                            className="hw-test-chevron"
                            size={16}
                            aria-hidden="true"
                          />
                        </summary>

                        <div className="hw-test-body">
                          <div className="hw-output-grid">
                            <OutputPanel
                              title="Expected Output"
                              output={result.expectedOutput}
                            />
                            <OutputPanel
                              title="Actual Output"
                              output={result.actualOutput}
                              tone={result.passed ? "pass" : "fail"}
                            />
                          </div>
                          {result.assertionType === "folder" && (
                            <div className="hw-output-grid" style={{ marginTop: 10 }}>
                              <OutputPanel
                                title="Expected Result"
                                output={String(result.expectedFolder || "No file changes.")}
                              />
                              <OutputPanel
                                title="Actual Result"
                                output={String(result.actualFolder || "No file changes.")}
                                tone={result.passed ? "pass" : "fail"}
                              />
                            </div>
                          )}

                          {typeof result.error === "string" &&
                            result.error !== "" && (
                              <p className="hw-test-error">
                                <AlertCircle size={15} aria-hidden="true" />
                                <span>{result.error}</span>
                              </p>
                            )}

                          {typeof result.stderr === "string" &&
                            result.stderr !== "" && (
                              <div className="hw-stderr">
                                <OutputPanel
                                  title="Standard error"
                                  output={result.stderr}
                                  tone="fail"
                                />
                              </div>
                            )}
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </details>
  );
}
