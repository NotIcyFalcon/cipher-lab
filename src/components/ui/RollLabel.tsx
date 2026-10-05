import type { CSSProperties } from "react";

/**
 * Button/link label whose letters roll up on hover or keyboard focus, one
 * after another (the hover treatment used on Britive's buttons). The visible
 * letters are hidden from assistive technology; the full text is read once.
 * Works in server components — the effect is pure CSS (see components.css).
 */
export default function RollLabel({ text }: { text: string }) {
  const letters = [...text];

  const line = (next: boolean) => (
    <span className={`ui-roll-line${next ? " is-next" : ""}`}>
      {letters.map((letter, index) => (
        <span key={index} style={{ "--i": index } as CSSProperties}>
          {letter === " " ? " " : letter}
        </span>
      ))}
    </span>
  );

  return (
    <span className="ui-roll">
      <span className="ui-sr-only">{text}</span>
      <span className="ui-roll-track" aria-hidden="true">
        {line(false)}
        {line(true)}
      </span>
    </span>
  );
}
