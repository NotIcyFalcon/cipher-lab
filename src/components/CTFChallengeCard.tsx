"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useActionState,
  useId,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flag,
  Lightbulb,
  Shield,
  Terminal,
  Trophy,
} from "lucide-react";

import { submitCTFFlag } from "@/app/actions/ctf";
import type {
  CTFSubmissionState,
  PublicCTFChallenge,
} from "@/lib/ctf-types";

// Default export from LabTerminal — dynamic import to avoid SSR
const LabTerminal = dynamic(
  () => import("@/components/LabTerminal"),
  {
    ssr: false,
    loading: () => <p role="status">Loading terminal…</p>,
  },
);

type CTFChallengeCardProps = {
  challenge: PublicCTFChallenge;
  solved: boolean;
  standalone?: boolean;
};

const initialSubmissionState: CTFSubmissionState = {
  status: "idle",
  message: "",
  awardedXp: 0,
};

const inlineRow: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
};

export function CTFChallengeCard({
  challenge,
  solved,
  standalone = false,
}: CTFChallengeCardProps) {
  const id = useId();

  const titleId = `${id}-title`;
  const bodyId = `${id}-body`;
  const hintId = `${id}-hint`;
  const terminalId = `${id}-terminal`;
  const inputId = `${id}-flag`;
  const feedbackId = `${id}-feedback`;

  const [expanded, setExpanded] = useState(standalone);
  const [hintOpen, setHintOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [flag, setFlag] = useState("");

  const [state, formAction, pending] = useActionState(
    submitCTFFlag,
    initialSubmissionState,
  );

  const isExpanded = standalone || expanded;

  const isSolved =
    solved ||
    state.status === "success" ||
    state.status === "already-solved";

  const feedback =
    state.message ||
    (isSolved ? "Solved. Your completion is saved." : "");

  const badges = (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.6rem",
        marginTop: "0.8rem",
      }}
    >
      <span className="pill" style={inlineRow}>
        <Shield size={14} aria-hidden="true" />
        {challenge.difficulty}
      </span>

      <span className="pill" style={inlineRow}>
        <Trophy size={14} aria-hidden="true" />
        {challenge.points} XP
      </span>

      <span
        className={isSolved ? "pill accent" : "pill"}
        style={inlineRow}
      >
        {isSolved && (
          <CheckCircle2 size={14} aria-hidden="true" />
        )}
        {isSolved ? "Solved" : "Unsolved"}
      </span>
    </span>
  );

  function toggleExpanded() {
    if (expanded) {
      setLabOpen(false);
    }

    setExpanded((value) => !value);
  }

  return (
    <article
      className="path-card"
      aria-labelledby={titleId}
      style={{ display: "block", minWidth: 0 }}
    >
      {standalone ? (
        <header>
          <span className="pill">{challenge.category}</span>
          <h1 id={titleId}>{challenge.title}</h1>
          {badges}
        </header>
      ) : (
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={bodyId}
          onClick={toggleExpanded}
          style={{
            display: "block",
            width: "100%",
            padding: 0,
            border: 0,
            background: "transparent",
            color: "inherit",
            font: "inherit",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <span
              id={titleId}
              style={{ fontSize: "1.15rem", fontWeight: 700 }}
            >
              {challenge.title}
            </span>

            {isExpanded ? (
              <ChevronUp size={20} aria-hidden="true" />
            ) : (
              <ChevronDown size={20} aria-hidden="true" />
            )}
          </span>

          {badges}
        </button>
      )}

      {isExpanded && (
        <div
          id={bodyId}
          role="region"
          aria-labelledby={titleId}
          style={{
            display: "grid",
            gap: "1.25rem",
            marginTop: "1.5rem",
            minWidth: 0,
          }}
        >
          {!standalone && (
            <div>
              <Link
                href={`/ctf/${encodeURIComponent(challenge.id)}`}
                className="secondary-button"
                style={inlineRow}
              >
                Open challenge
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          )}

          <p
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              lineHeight: 1.7,
            }}
          >
            {challenge.description}
          </p>

          {challenge.hint && (
            <div>
              <button
                type="button"
                className="secondary-button"
                aria-expanded={hintOpen}
                aria-controls={hintId}
                onClick={() => setHintOpen((value) => !value)}
                style={inlineRow}
              >
                <Lightbulb size={16} aria-hidden="true" />
                {hintOpen ? "Hide hint" : "Show hint"}
              </button>

              {hintOpen && (
                <p
                  id={hintId}
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                  }}
                >
                  {challenge.hint}
                </p>
              )}
            </div>
          )}

          {challenge.labId && (
            <div style={{ minWidth: 0 }}>
              <button
                type="button"
                className="secondary-button"
                aria-expanded={labOpen}
                aria-controls={terminalId}
                onClick={() => setLabOpen((value) => !value)}
                style={inlineRow}
              >
                <Terminal size={16} aria-hidden="true" />
                {labOpen ? "Close terminal" : "Connect to lab"}
              </button>

              {labOpen && (
                <div
                  id={terminalId}
                  style={{ marginTop: "1rem", minWidth: 0 }}
                >
                  <LabTerminal labId={challenge.labId} title={challenge.title} />
                </div>
              )}
            </div>
          )}

          {!isSolved && (
            <form
              action={formAction}
              aria-busy={pending}
              style={{ display: "grid", gap: "0.65rem" }}
            >
              <input
                type="hidden"
                name="challengeId"
                value={challenge.id}
              />

              <label htmlFor={inputId} style={{ fontWeight: 600, fontSize: "13px" }}>Flag</label>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <input
                  id={inputId}
                  name="flag"
                  type="text"
                  value={flag}
                  onChange={(event) => setFlag(event.target.value)}
                  placeholder="CYBERBOX{...}"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={512}
                  required
                  disabled={pending}
                  aria-invalid={state.status === "error"}
                  aria-describedby={feedbackId}
                  style={{
                    flex: "1 1 16rem",
                    minWidth: 0,
                    padding: "0.8rem 1rem",
                    border: "1px solid var(--border)",
                    borderRadius: "0.65rem",
                    background: "var(--bg)",
                    color: "inherit",
                    font: "inherit",
                  }}
                />

                <button
                  type="submit"
                  className="primary-button"
                  disabled={pending || flag.trim().length === 0}
                  style={inlineRow}
                >
                  <Flag size={16} aria-hidden="true" />
                  {pending ? "Checking…" : "Submit Flag"}
                </button>
              </div>
            </form>
          )}

          <div id={feedbackId} role="status" aria-live="polite">
            {feedback && (
              <p
                className={isSolved ? "accent" : undefined}
                style={{
                  margin: 0,
                  color:
                    state.status === "error"
                      ? "#ff8b8b"
                      : undefined,
                }}
              >
                {feedback}
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
