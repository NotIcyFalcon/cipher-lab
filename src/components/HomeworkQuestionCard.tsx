"use client";

import {
  useEffect,
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
  Timer,
  Trophy,
  Upload,
  XCircle,
} from "lucide-react";

import {
  gradeHomework,
  listHomeworkSubmissions,
  readHomeworkSubmission,
} from "@/app/actions/grade-homework";
import type { CheckResult, DiffLine, TestFeedback } from "@/lib/homework-results";
import type {
  HistoryPage,
  HomeworkQuestion,
  LegacyTestResult,
  Submission,
  TestResult,
} from "@/lib/progress-types";
import RichText from "@/components/RichText";

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
        <code>{empty ? <span className="hw-output-empty">(nothing)</span> : output}</code>
      </pre>
    </div>
  );
}

function DiffView({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="hw-diff" role="group" aria-label="Differences between expected and your output">
      <div className="hw-diff-legend">
        <span className="is-expected">− expected</span>
        <span className="is-actual">+ your output</span>
      </div>
      <pre>
        {lines.map((line, index) => (
          <span key={index} className={`hw-diff-line is-${line.op}`}>
            <span className="hw-diff-marker" aria-hidden="true">
              {line.op === "expected" ? "−" : line.op === "actual" ? "+" : line.op === "skip" ? "⋯" : " "}
            </span>
            {line.op === "skip" ? `(${line.text})` : line.text === "" ? " " : line.text}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
}

function CheckView({ check }: { check: CheckResult }) {
  return (
    <li className={`hw-check ${check.passed ? "is-pass" : "is-fail"}`}>
      <div className="hw-check-heading">
        {check.passed ? (
          <CheckCircle2 size={15} aria-hidden="true" />
        ) : (
          <XCircle size={15} aria-hidden="true" />
        )}
        <strong>{check.label}</strong>
        <span>{check.summary}</span>
      </div>

      {!check.passed && check.diff && check.diff.length > 0 && <DiffView lines={check.diff} />}

      {!check.passed && check.kind === "stdout" && (check.expected !== undefined || check.actual !== undefined) && (
        <details className="hw-check-raw">
          <summary>Show full expected and actual output</summary>
          <div className="hw-output-grid">
            <OutputPanel title="Expected output" output={check.expected} />
            <OutputPanel title="Your output" output={check.actual} tone="fail" />
          </div>
        </details>
      )}

      {!check.passed && check.files && check.files.length > 0 && (
        <ul className="hw-file-problems">
          {check.files.map((problem, index) => (
            <li key={`${problem.path}:${index}`} className={`is-${problem.problem}`}>
              <span>{problem.message}</span>
              {problem.diff && problem.diff.length > 0 && <DiffView lines={problem.diff} />}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function isFeedback(result: TestResult): result is TestFeedback {
  return (result as TestFeedback).v === 2;
}

function TestView({ result, submissionId, index }: { result: TestResult; submissionId: number; index: number }) {
  if (!isFeedback(result)) {
    const legacy = result as LegacyTestResult;
    return (
      <li>
        <details className="hw-test" data-passed={legacy.passed}>
          <summary className="hw-test-summary">
            <span className="hw-test-status">
              {legacy.passed ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
              {legacy.passed ? "PASS" : "FAIL"}
            </span>
            <span className="hw-test-name">{legacy.name}</span>
            <ChevronDown className="hw-test-chevron" size={16} aria-hidden="true" />
          </summary>
          <div className="hw-test-body">
            <div className="hw-output-grid">
              <OutputPanel title="Expected output" output={legacy.expectedOutput} />
              <OutputPanel title="Your output" output={legacy.actualOutput} tone={legacy.passed ? "pass" : "fail"} />
            </div>
          </div>
        </details>
      </li>
    );
  }

  return (
    <li key={`${submissionId}:${index}`}>
      <details className="hw-test" data-passed={result.passed} open={!result.passed && !result.hidden && index < 3}>
        <summary className="hw-test-summary">
          <span className="hw-test-status">
            {result.passed ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
            {result.passed ? "PASS" : "FAIL"}
          </span>
          <span className="hw-test-name">{result.name}</span>
          <span className="hw-test-meta">
            <Timer size={12} aria-hidden="true" />
            {(result.durationMs / 1000).toFixed(2)}s · {result.points}/{result.maxPoints} XP
          </span>
          <ChevronDown className="hw-test-chevron" size={16} aria-hidden="true" />
        </summary>

        <div className="hw-test-body">
          {result.input && (result.input.args || result.input.stdin) && (
            <div className="hw-test-input">
              {result.input.args && (
                <p>
                  <strong>Arguments:</strong> <code>{result.input.args}</code>
                </p>
              )}
              {result.input.stdin && <OutputPanel title="Standard input given to your script" output={result.input.stdin} />}
            </div>
          )}

          <ul className="hw-checks">
            {result.checks.map((check, checkIndex) => (
              <CheckView key={checkIndex} check={check} />
            ))}
          </ul>

          {result.hidden && !result.passed && (
            <p className="hw-section-description">
              Hidden tests don&apos;t show their inputs or expected results. Compare your script with the visible
              tests and think about edge cases (empty input, spaces in names, missing files…).
            </p>
          )}

          {result.stderr && (
            <div className="hw-stderr">
              <OutputPanel title="Errors printed by your script (stderr)" output={result.stderr} tone="fail" />
            </div>
          )}
        </div>
      </details>
    </li>
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
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [pasted, setPasted] = useState("");
  const [history, setHistory] = useState<HistoryPage | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [sessionBest, setSessionBest] = useState(0);

  const busyRef = useRef(false);
  const id = useId();

  const inputId = `${id}-script`;
  const pasteId = `${id}-paste`;
  const errorId = `${id}-error`;
  const titleId = `${id}-title`;
  const resultTitleId = `${id}-result-title`;

  const busy = pending || operation !== null;
  const canSubmit = question.ready && !busy && (mode === "upload" ? Boolean(filename) : Boolean(pasted.trim()));

  const best = Math.min(question.totalPoints, Math.max(0, bestXp, sessionBest));
  const perfect = best === question.totalPoints && question.totalPoints > 0;

  // While the selected submission is being graded, check on it every 2s.
  const selectedId = selected?.id;
  const selectedPending = selected?.status === "pending";

  useEffect(() => {
    if (!selectedPending || selectedId === undefined) return;
    let stopped = false;
    const startedAt = Date.now();

    const timer = setInterval(async () => {
      if (stopped) return;
      if (Date.now() - startedAt > 15 * 60_000) {
        clearInterval(timer);
        return;
      }
      try {
        const latest = await readHomeworkSubmission(selectedId);
        if (stopped || latest.status === "pending") return;
        setSelected((current) => (current?.id === latest.id ? latest : current));
        if (latest.status === "graded") {
          setSessionBest((previous) => Math.max(previous, latest.awardedXp));
        }
        setHistory((current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) =>
                  item.id === latest.id
                    ? { ...item, status: latest.status, awardedXp: latest.awardedXp, passedTests: latest.passedTests, totalPoints: latest.totalPoints, totalTests: latest.totalTests }
                    : item,
                ),
              }
            : current,
        );
      } catch {
        // Try again on the next tick.
      }
    }, 2_000);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [selectedId, selectedPending]);

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
    formData.set("questionId", question.questionId);
    if (mode === "paste") {
      formData.delete("file");
      formData.set("script", pasted);
    } else {
      formData.delete("script");
    }

    run("grade", async () => {
      const reply = await gradeHomework(formData);
      if (!reply.ok) {
        setError(reply.error);
        return;
      }

      setSelected(reply.submission);
      if (history !== null) {
        setHistory(await listHomeworkSubmissions(question.homeworkId, question.questionId));
      }
    });
  }

  function loadHistory(reset: boolean) {
    run("history", async () => {
      const cursor = reset ? undefined : history?.nextCursor ?? undefined;
      const page = await listHomeworkSubmissions(question.homeworkId, question.questionId, cursor);

      setHistory((previous) => ({
        items: reset || !previous ? page.items : [...previous.items, ...page.items],
        nextCursor: page.nextCursor,
      }));
    });
  }

  function openSubmission(submissionId: number) {
    run("submission", async () => {
      setSelected(await readHomeworkSubmission(submissionId));
    });
  }

  const selectedPerfect = selected?.status === "graded" && selected.awardedXp === selected.totalPoints;

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
          {perfect ? <Check size={19} /> : String(questionNumber).padStart(2, "0")}
        </span>

        <span className="hw-question-copy">
          <span className="dashboard-kicker">{question.homeworkTitle.toUpperCase()}</span>
          <strong id={titleId}>{question.title}</strong>
          <span className="hw-question-meta">
            <FlaskConical size={12} aria-hidden="true" />
            {question.totalTests} {question.totalTests === 1 ? "test" : "tests"}
            {question.hiddenTests > 0 && ` (${question.hiddenTests} hidden)`}
            <span aria-hidden="true">·</span>
            {question.totalPoints} XP
            <span aria-hidden="true">·</span>
            {question.timeLimitSec}s per test
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

        <ChevronDown className="hw-question-chevron" size={19} aria-hidden="true" />
      </summary>

      <div className="hw-question-body">
        <section className="hw-briefing" aria-labelledby={`${id}-briefing`}>
          <div className="hw-subheading">
            <span className="hw-small-icon" aria-hidden="true">
              <FileCode2 size={17} />
            </span>
            <div>
              <span className="dashboard-kicker">MISSION BRIEFING</span>
              <h3 id={`${id}-briefing`}>What your script should do</h3>
            </div>
          </div>
          <div className="hw-objective">
            <RichText text={question.objective} />
          </div>

          <p className="hw-section-description">
            Your script runs once per test, each time in a fresh, empty folder (prepared by the test) with no
            internet. It earns each test&apos;s XP when its output, exit code and the files it leaves in the folder
            match the reference solution.
            {question.baseXp > 0 && ` Passing every test adds a ${question.baseXp} XP bonus.`}
          </p>

          {question.examples.length > 0 && (
            <div className="hw-examples">
              {question.examples.map((example) => (
                <details key={example.name} className="hw-example">
                  <summary>{example.name}</summary>
                  {example.setup && <OutputPanel title="Before your script runs, the test does" output={example.setup} />}
                  {example.args && (
                    <p>
                      <strong>Run as:</strong> <code>bash solution.sh {example.args}</code>
                    </p>
                  )}
                  {example.stdin && <OutputPanel title="Standard input" output={example.stdin} />}
                  {example.expectedStdout !== null && <OutputPanel title="Expected output" output={example.expectedStdout} />}
                </details>
              ))}
            </div>
          )}
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

          {!question.ready ? (
            <p className="hw-result-message">
              {question.preparing
                ? "This question is being prepared. Submissions open in a minute or two."
                : "This question isn't available yet."}
            </p>
          ) : (
            <form onSubmit={submit} className="hw-upload-form" aria-labelledby={titleId} aria-busy={operation === "grade"}>
              <div className="hw-mode-switch" role="tablist" aria-label="How to submit">
                <button type="button" role="tab" aria-selected={mode === "upload"} className={mode === "upload" ? "is-active" : ""} onClick={() => setMode("upload")}>
                  <Upload size={14} aria-hidden="true" /> Upload file
                </button>
                <button type="button" role="tab" aria-selected={mode === "paste"} className={mode === "paste" ? "is-active" : ""} onClick={() => setMode("paste")}>
                  <Code2 size={14} aria-hidden="true" /> Paste script
                </button>
              </div>

              {mode === "upload" ? (
                <div className="hw-upload-zone">
                  <Upload size={25} aria-hidden="true" />
                  <label htmlFor={inputId}>Choose your Bash script</label>
                  <p>The grader runs it with bash.</p>
                  <input
                    id={inputId}
                    name="file"
                    type="file"
                    accept=".sh"
                    disabled={busy}
                    onChange={(event) => {
                      setFilename(event.target.files?.[0]?.name ?? "");
                      setError("");
                    }}
                  />
                  <small>UTF-8 .sh file · Maximum size 64 KB</small>
                </div>
              ) : (
                <label className="hw-paste" htmlFor={pasteId}>
                  <span>Your script</span>
                  <textarea
                    id={pasteId}
                    value={pasted}
                    rows={12}
                    spellCheck={false}
                    maxLength={64 * 1024}
                    placeholder={"#!/bin/bash\n"}
                    disabled={busy}
                    onChange={(event) => {
                      setPasted(event.target.value);
                      setError("");
                    }}
                  />
                </label>
              )}

              <div className="hw-upload-actions">
                <span className="hw-file-status">
                  <FileCode2 size={14} aria-hidden="true" />
                  <span>{mode === "upload" ? filename || "No script selected" : `${pasted.split("\n").length} lines`}</span>
                </span>

                <button type="submit" className="primary-button" disabled={!canSubmit}>
                  {operation === "grade" ? (
                    <LoaderCircle size={16} className="hw-spinner" aria-hidden="true" />
                  ) : (
                    <ArrowRight size={16} aria-hidden="true" />
                  )}
                  {operation === "grade" ? "Submitting…" : "Submit for grading"}
                </button>
              </div>
            </form>
          )}

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
          {operation === "history"
            ? "Loading submission history."
            : operation === "submission"
              ? "Loading the selected submission."
              : selectedPending
                ? "Your script is being graded."
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

        <section className="hw-history" aria-labelledby={`${id}-history-title`}>
          <div className="hw-section-heading">
            <div>
              <span className="dashboard-kicker">YOUR ITERATIONS</span>
              <h3 id={`${id}-history-title`}>
                <History size={17} aria-hidden="true" />
                Submission history
              </h3>
            </div>

            <button type="button" className="secondary-button" disabled={busy} onClick={() => loadHistory(true)}>
              {operation === "history" ? (
                <LoaderCircle size={14} className="hw-spinner" aria-hidden="true" />
              ) : (
                <RefreshCw size={14} aria-hidden="true" />
              )}
              {history === null ? "Load history" : "Refresh history"}
            </button>
          </div>

          {history === null ? (
            <p className="hw-section-description">Load previous attempts to compare your solutions and feedback.</p>
          ) : history.items.length === 0 ? (
            <div className="hw-history-empty">
              <History size={21} aria-hidden="true" />
              <p>No submissions yet. Your first attempt starts the story.</p>
            </div>
          ) : (
            <ul className="hw-history-list">
              {history.items.map((submission) => {
                const graded = submission.status === "graded";
                const complete = graded && submission.awardedXp === submission.totalPoints;
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
                        className={`hw-history-icon${complete ? " is-pass" : graded ? " is-review" : isPending ? "" : " is-fail"}`}
                        aria-hidden="true"
                      >
                        {complete ? <CheckCircle2 size={17} /> : graded ? <FileCode2 size={17} /> : isPending ? <Clock3 size={17} /> : <AlertCircle size={17} />}
                      </span>

                      <span className="hw-history-copy">
                        <strong>Submission #{submission.id}</strong>
                        <time dateTime={new Date(submission.createdAt).toISOString()}>
                          {new Date(submission.createdAt).toLocaleString()}
                        </time>
                      </span>

                      <span className="hw-history-score">
                        {graded
                          ? `${submission.awardedXp} / ${submission.totalPoints} XP · ${submission.passedTests}/${submission.totalTests} tests`
                          : isPending
                            ? "Grading…"
                            : "Grading error"}
                      </span>

                      <ArrowRight className="hw-history-arrow" size={15} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {history !== null && history.nextCursor !== null && (
            <button type="button" className="secondary-button hw-load-older" disabled={busy} onClick={() => loadHistory(false)}>
              <ArrowDown size={14} aria-hidden="true" />
              Load older submissions
            </button>
          )}
        </section>

        {selected && (
          <section className={`hw-submission ${selectedState}`} aria-labelledby={resultTitleId} aria-live="polite">
            <header className="hw-result-heading">
              <span className="hw-result-icon" aria-hidden="true">
                {selectedPerfect ? (
                  <CheckCircle2 size={23} />
                ) : selected.status === "pending" ? (
                  <LoaderCircle size={23} className="hw-spinner" />
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
                    ? "Graded"
                    : selected.status === "pending"
                      ? "Grading…"
                      : "Grading error"}
              </span>
            </header>

            {selected.status === "graded" && (
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
            )}

            {selected.status === "pending" && (
              <p className="hw-result-message">
                Your script is running against every test in a sandbox. This page updates by itself when it finishes.
              </p>
            )}

            {selected.error && <p className="hw-result-error">{selected.error}</p>}

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
                  <span>Failed tests open automatically. In diffs, green (−) lines are expected and red (+) lines are what your script produced.</span>
                </div>

                <ul className="hw-test-list">
                  {selected.results.map((result, index) => (
                    <TestView key={`${selected.id}:${index}`} result={result} submissionId={selected.id} index={index} />
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
