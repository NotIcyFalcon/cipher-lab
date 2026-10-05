"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

declare global {
  interface Window {
    __cyberboxLenis?: Lenis;
  }
}

/**
 * Inertial wheel scrolling (Lenis), as on Britive. Native scrolling is kept
 * for touch devices, keyboard scrolling, and anything marked
 * data-lenis-prevent (terminals, code panes, text areas, inner scrollers).
 * Disabled entirely when the user prefers reduced motion.
 */
export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      anchors: { offset: -96 },
      // Inner scrollers (Creator library, editors, result panes) keep the wheel
      // while they can still scroll; the page takes over at their ends.
      allowNestedScroll: true,
      // Always native for terminals, text areas and anything marked data-lenis-prevent.
      prevent: (node) =>
        node instanceof HTMLElement &&
        (node.matches("textarea, select, .xterm, .xterm *, pre, [data-lenis-prevent], [data-lenis-prevent] *") ||
          node.closest(".xterm, [data-lenis-prevent]") !== null),
    });

    window.__cyberboxLenis = lenis;

    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });

    const stopForReducedMotion = (event: MediaQueryListEvent) => {
      if (event.matches) lenis.destroy();
    };
    reduce.addEventListener("change", stopForReducedMotion);

    return () => {
      cancelAnimationFrame(frame);
      reduce.removeEventListener("change", stopForReducedMotion);
      lenis.destroy();
      if (window.__cyberboxLenis === lenis) delete window.__cyberboxLenis;
    };
  }, []);

  // A new page starts at the top, without an animated scroll from the old position.
  useEffect(() => {
    window.__cyberboxLenis?.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return null;
}
