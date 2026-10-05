"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/* Fixed ember positions (no randomness during render). */
const EMBERS = [
  { x: 8, delay: 0, duration: 16, size: 3 },
  { x: 21, delay: 9, duration: 21, size: 2 },
  { x: 37, delay: 4, duration: 18, size: 2 },
  { x: 58, delay: 12, duration: 22, size: 3 },
  { x: 74, delay: 2, duration: 19, size: 2 },
  { x: 91, delay: 7, duration: 17, size: 3 },
];

/**
 * The site background behind every page except the dashboard showcase, in
 * the showcase's colours: static fog and grain (painted once), a few embers
 * (compositor-only CSS animation) and a soft light that follows the pointer.
 * Nothing here runs while you scroll; the light only moves when the pointer
 * does, and stops as soon as it has caught up.
 */
export default function SiteBackdrop() {
  const lightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight * 0.3;
    let targetX = x;
    let targetY = y;
    let frame = 0;

    const tick = () => {
      x += (targetX - x) * 0.12;
      y += (targetY - y) * 0.12;
      light.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      frame = Math.abs(targetX - x) > 0.5 || Math.abs(targetY - y) > 0.5 ? requestAnimationFrame(tick) : 0;
    };

    const onPointer = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    light.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    light.dataset.live = "true";
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return (
    <div className="ui-backdrop" aria-hidden="true">
      <div ref={lightRef} className="ui-backdrop-light" />
      <div className="ui-backdrop-embers">
        {EMBERS.map((ember, index) => (
          <i
            key={index}
            style={
              {
                "--x": `${ember.x}%`,
                "--delay": `${-ember.delay}s`,
                "--duration": `${ember.duration}s`,
                "--size": `${ember.size}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
