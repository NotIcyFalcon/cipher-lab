"use client";

import { useEffect, useRef, useState } from "react";

type Line = { kind: "title" | "field" | "cmd" | "note"; label?: string; text: string };

const BLOCKS = 56;

function sessionLines(operator: string): Line[] {
  return [
    { kind: "title", text: "> Open session / root@cyberbox" },
    { kind: "field", label: "Operator", text: `${operator} · node cbx-01 · tty pts/0` },
    { kind: "cmd", text: "nmap -sV 10.0.0.0/24 — 23 hosts up. 4 services listening." },
    { kind: "cmd", text: "ssh lab@sandbox.cbx — key accepted. Tunnel established." },
    { kind: "cmd", text: "docker compose up -d — 2 containers healthy." },
    { kind: "cmd", text: "kubectl rollout status deploy/range — successfully rolled out." },
    { kind: "note", text: "Practise only on systems you own or are authorised to test." },
  ];
}

const lineLength = (line: Line) => (line.label ? line.label.length + 1 : 0) + line.text.length;

/**
 * The terminal "session record" that plays before the showcase: lines type
 * themselves out, a block meter fills while the stage loads, then Enter.
 */
export default function BootLoader({
  operator,
  ready,
  instant,
  leaving,
  onEnter,
}: {
  operator: string;
  /** True once the WebGL stage and fonts are loaded. */
  ready: boolean;
  /** Reduced motion: show everything at once. */
  instant: boolean;
  /** Fading out after Enter. */
  leaving: boolean;
  onEnter: () => void;
}) {
  const lines = sessionLines(operator);
  const total = lines.reduce((sum, line) => sum + lineLength(line), 0);
  const [typedChars, setTyped] = useState(0);
  const typed = instant ? total : typedChars;
  const enterRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (instant) return;
    let frame = 0;
    let count = 0;
    let last = performance.now();
    const step = (now: number) => {
      // Roughly 70 characters a second, independent of frame rate.
      count = Math.min(total, count + Math.max(1, Math.round(((now - last) / 1000) * 70)));
      last = now;
      setTyped(count);
      if (count < total) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [instant, total]);

  const typingDone = typed >= total;
  const done = typingDone && ready;
  // The meter tracks typing, but never claims 100% before the stage is ready.
  const progress = Math.min(typed / total, ready ? 1 : 0.92);
  const filled = Math.round(progress * BLOCKS);

  useEffect(() => {
    if (done) enterRef.current?.focus({ preventScroll: true });
  }, [done]);

  // Reveal the typed characters line by line: each line starts where the
  // previous ones end.
  const starts = lines.map((_, index) => lines.slice(0, index).reduce((sum, line) => sum + lineLength(line), 0));
  const rendered = lines.map((line, index) => {
    const length = lineLength(line);
    const shown = Math.max(0, Math.min(length, typed - starts[index]));
    const labelLength = line.label ? line.label.length + 1 : 0;
    return {
      line,
      visible: shown > 0,
      label: line.label ? line.label.slice(0, shown) : "",
      text: line.text.slice(0, Math.max(0, shown - labelLength)),
      active: shown > 0 && shown < length,
    };
  });

  return (
    <div
      className="sc-boot"
      data-leaving={leaving || undefined}
      role="dialog"
      aria-modal={!leaving}
      aria-hidden={leaving || undefined}
      aria-labelledby="sc-boot-title"
    >
      <div className="sc-boot-panel">
        <header className="sc-boot-head">
          <span id="sc-boot-title">CBX / Session record 0x7E1-B</span>
          <i className="sc-boot-deco" aria-hidden="true" />
        </header>

        <div className="sc-boot-body">
          <p className="ui-sr-only">
            {lines.map((line) => `${line.label ? `${line.label} ` : ""}${line.text}`).join(". ")}
          </p>
          <div aria-hidden="true">
            {rendered.map(({ line, visible, label, text, active }, index) =>
              visible ? (
                <p key={index} className={`sc-boot-line is-${line.kind}`}>
                  {line.kind === "cmd" && <span className="sc-boot-prompt">$ </span>}
                  {label && <strong>{label} </strong>}
                  {text}
                  {active && <span className="sc-boot-cursor" />}
                </p>
              ) : null,
            )}
            {typingDone && !done && <span className="sc-boot-cursor is-idle" />}
          </div>
        </div>

        <footer className="sc-boot-foot">
          <span className="sc-boot-status">{done ? "Access granted · press enter" : "Establishing uplink"}</span>
          <span className="sc-boot-blocks" aria-hidden="true">
            {Array.from({ length: BLOCKS }, (_, index) => (
              <i key={index} data-on={index < filled || undefined} />
            ))}
          </span>
          <span className="sc-boot-pct" role="progressbar" aria-label="Loading" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            {Math.round(progress * 100)}%
          </span>
        </footer>
      </div>

      <div className="sc-boot-actions" data-show={done || undefined}>
        <p className="sc-boot-ack">
          <strong>[ Authorised ]</strong> Yes, I will only hack what I am allowed to hack.
        </p>
        <button ref={enterRef} type="button" className="sc-btn sc-btn--primary" data-label="Enter" onClick={onEnter} disabled={!done || leaving}>
          <span className="sc-btn-label">Enter</span>
        </button>
      </div>
    </div>
  );
}
