"use client";

import { useEffect } from "react";

const MAX_TILT = 2.5;

/**
 * One document-level listener that feeds the pointer position into whichever
 * [data-spot] tile is under it (--mx/--my for the spotlight and border glow,
 * --rx/--ry for a slight tilt). Tilt is skipped when motion is reduced.
 */
export default function PointerSpotlight() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let current: HTMLElement | null = null;

    const reset = (element: HTMLElement) => {
      element.style.removeProperty("--rx");
      element.style.removeProperty("--ry");
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-spot]") : null;
      if (current && current !== target) reset(current);
      current = target;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      target.style.setProperty("--mx", `${x}px`);
      target.style.setProperty("--my", `${y}px`);
      if (!reduced && !target.classList.contains("is-locked")) {
        target.style.setProperty("--ry", `${((x / rect.width) * 2 - 1) * MAX_TILT}deg`);
        target.style.setProperty("--rx", `${-((y / rect.height) * 2 - 1) * MAX_TILT}deg`);
      }
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (current) reset(current);
    };
  }, []);

  return null;
}
