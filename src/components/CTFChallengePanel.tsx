"use client";

import {
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Flag,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
  UnlockKeyhole,
} from "lucide-react";

import { buyCTFHint, submitCTFFlag } from "@/app/actions/ctf";
import type {
  CTFActionReply,
  CTFChallengeState,
} from "@/lib/ctf-types";

type Props = {
  challengeId: string;
  initialState: CTFChallengeState;
};

export default function CTFChallengePanel({
  challengeId,
  initialState,
}: Props) {
  const router = useRouter();
  const id = useId();
  const inFlight = useRef(false);

  const [state, setState] = useState(initialState);
  const [flag, setFlag] = useState("");
  const [pending, startTransition] = useTransition();
  const [operation, setOperation] = useState<string | null>(null);
  const [confirmHint, setConfirmHint] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  function receive(reply: CTFActionReply) {
    if (reply.state) {
      setState(reply.state);
    }

    if (!reply.ok) {
      setFeedback({ kind: "error", text: reply.error });
      return;
    }

    const messages = {
      unlocked: "Hint unlocked. Your achievable score has been updated.",
      "already-unlocked": "This hint is already unlocked.",
      correct: `Flag accepted. ${reply.state.awardedXp ?? 0} CTF XP recorded.`,
      "already-complete":
        "Correct again. Your original score is preserved; no duplicate XP was awarded.",
    };

    setFeedback({
      kind: "success",
      text: messages[reply.outcome],
    });

    if (
      reply.outcome === "correct" ||
      reply.outcome === "already-complete"
    ) {
      setFlag("");
    }
  }

  function perform(
    name: string,
    action: () => Promise<CTFActionReply>,
  ) {
    if (inFlight.current) return;

    inFlight.current = true;
    setOperation(name);
    setFeedback(null);

    startTransition(async () => {
      try {
        const reply = await action();
        receive(reply);

        if (reply.ok || reply.state) {
          router.refresh();
        }
      } catch {
        setFeedback({
          kind: "error",
          text: "The request could not finish. Please try again.",
        });
      } finally {
        inFlight.current = false;
        setOperation(null);
        setConfirmHint(null);
      }
    });
  }

  function submitFlag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);

    perform("flag", () => submitCTFFlag(data));
  }

  return (
    <div className="ctf-interaction">
      <section
        className="ctf-submit-panel"
        aria-labelledby={`${id}-submit-title`}
      >
        <div className="ctf-panel-bar">
          <span className="ctf-panel-label">
            <Flag size={15} aria-hidden="true" />
            FLAG VERIFICATION
          </span>
          <span className="ctf-mono-note">EXACT MATCH</span>
        </div>

        <div className="ctf-submit-body">
          <div className="ctf-submit-heading">
            <div>
              <h2 id={`${id}-submit-title`}>
                {state.completed ? "Run it back." : "Make your discovery count."}
              </h2>
              <p>
                {state.completed
                  ? "Re-attempt the mission whenever you like. Your recorded XP stays unchanged."
                  : "Submit the flag from your investigation. Flags are case-sensitive; surrounding whitespace is ignored."}
              </p>
            </div>

            <div className="ctf-live-score">
              <span>
                {state.completed ? "RECORDED SCORE" : "AVAILABLE NOW"}
              </span>
              <strong>
                {state.completed ? state.awardedXp : state.achievableXp}
                <small> XP</small>
              </strong>
            </div>
          </div>

          {state.completed && (
            <div className="ctf-complete-note">
              <ShieldCheck size={18} aria-hidden="true" />
              <span>
                Mission completed. Your score has been permanently recorded.
              </span>
            </div>
          )}

          <form
            className="ctf-flag-form"
            onSubmit={submitFlag}
            aria-busy={pending}
          >
            <input
              type="hidden"
              name="challengeId"
              value={challengeId}
            />

            <label htmlFor={`${id}-flag`}>Recovered flag</label>

            <div className="ctf-flag-controls">
              <div className="ctf-flag-input-wrap">
                <span aria-hidden="true">&gt;_</span>
                <input
                  id={`${id}-flag`}
                  name="flag"
                  type="text"
                  value={flag}
                  onChange={(event) => setFlag(event.target.value)}
                  placeholder="cyberbox{...}"
                  maxLength={512}
                  required
                  disabled={pending}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-describedby={`${id}-flag-note`}
                />
              </div>

              <button
                type="submit"
                className="ctf-button ctf-button-primary"
                disabled={pending || !flag.trim()}
              >
                {operation === "flag" ? (
                  <LoaderCircle
                    size={16}
                    className="ctf-spinner"
                    aria-hidden="true"
                  />
                ) : (
                  <Flag size={16} aria-hidden="true" />
                )}
                {operation === "flag"
                  ? "Verifying"
                  : state.completed
                    ? "Verify again"
                    : "Submit flag"}
              </button>
            </div>

            <p id={`${id}-flag-note`} className="ctf-input-note">
              {state.penaltyXp > 0
                ? `${state.penaltyXp} XP in hint penalties applied to this mission.`
                : "No hints purchased. The full mission score is still intact."}
            </p>
          </form>
        </div>
      </section>

      <div
        className={`ctf-feedback${
          feedback ? ` is-${feedback.kind}` : ""
        }`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {feedback && (
          <>
            {feedback.kind === "success" ? (
              <CheckCircle2 size={18} aria-hidden="true" />
            ) : (
              <TriangleAlert size={18} aria-hidden="true" />
            )}
            <span>{feedback.text}</span>
          </>
        )}
      </div>

      <section
        className="ctf-hints-section"
        aria-labelledby={`${id}-hints-title`}
      >
        <div className="ctf-section-heading">
          <div>
            <span className="ctf-kicker">OPTIONAL INTELLIGENCE</span>
            <h2 id={`${id}-hints-title`}>A lead, at a price.</h2>
          </div>
          <Lightbulb size={23} aria-hidden="true" />
        </div>

        <p className="ctf-hints-intro">
          Hints unlock permanently for your account. Each purchase reduces
          this mission’s achievable XP—not XP earned from other missions.
          {state.completed &&
            " New purchases are disabled after completion."}
        </p>

        {state.hints.length === 0 ? (
          <div className="ctf-empty-inline">
            No hints are available for this mission. Follow the briefing.
          </div>
        ) : (
          <ol className="ctf-hint-list">
            {state.hints.map((hint) => {
              const confirming = confirmHint === hint.index;
              const buying = operation === `hint-${hint.index}`;

              return (
                <li
                  key={hint.index}
                  className={`ctf-hint${
                    hint.unlocked ? " is-unlocked" : ""
                  }`}
                >
                  <div className="ctf-hint-heading">
                    <span className="ctf-hint-icon" aria-hidden="true">
                      {hint.unlocked ? (
                        <UnlockKeyhole size={18} />
                      ) : (
                        <LockKeyhole size={18} />
                      )}
                    </span>

                    <div className="ctf-hint-title">
                      <h3>Hint {String(hint.index + 1).padStart(2, "0")}</h3>
                      <span>
                        {hint.unlocked
                          ? "Intelligence acquired"
                          : state.completed
                            ? "Purchase unavailable after completion"
                            : "Encrypted intelligence"}
                      </span>
                    </div>

                    <span className="ctf-hint-cost">
                      {hint.penalty === 0 ? "FREE" : `−${hint.penalty} XP`}
                    </span>

                    {hint.unlocked ? (
                      <span className="ctf-hint-owned">
                        <Check size={14} aria-hidden="true" />
                        Unlocked
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="ctf-button ctf-button-quiet"
                        disabled={pending || state.completed}
                        aria-expanded={confirming}
                        aria-controls={`${id}-hint-${hint.index}`}
                        onClick={() => {
                          setFeedback(null);
                          setConfirmHint(confirming ? null : hint.index);
                        }}
                      >
                        {state.completed ? "Locked" : "Unlock hint"}
                        <ArrowRight size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {hint.unlocked && (
                    <p className="ctf-hint-text">{hint.text}</p>
                  )}

                  {!hint.unlocked && confirming && (
                    <div
                      id={`${id}-hint-${hint.index}`}
                      className="ctf-hint-confirm"
                    >
                      <p>
                        Permanently unlock this hint?
                        {hint.penalty > 0
                          ? ` Your achievable score will change from ${state.achievableXp} to ${Math.max(
                              0,
                              state.achievableXp - hint.penalty,
                            )} XP.`
                          : " This hint has no XP penalty."}
                        {" "}This cannot be undone.
                      </p>

                      <div className="ctf-confirm-actions">
                        <button
                          type="button"
                          className="ctf-button ctf-button-warning"
                          disabled={pending}
                          onClick={() =>
                            perform(`hint-${hint.index}`, () =>
                              buyCTFHint(challengeId, hint.index),
                            )
                          }
                        >
                          {buying && (
                            <LoaderCircle
                              size={14}
                              className="ctf-spinner"
                              aria-hidden="true"
                            />
                          )}
                          {buying
                            ? "Unlocking"
                            : hint.penalty === 0
                              ? "Confirm unlock"
                              : `Buy hint · −${hint.penalty} XP`}
                        </button>

                        <button
                          type="button"
                          className="ctf-button ctf-button-quiet"
                          disabled={pending}
                          onClick={() => setConfirmHint(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
