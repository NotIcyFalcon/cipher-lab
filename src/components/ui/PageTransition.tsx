"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Re-mounts the page content on navigation so it plays the enter animation
 * (a short rise + fade, see shell.css), and moves focus to the main region
 * so screen readers start at the new page. Scroll-in reveals are pure CSS
 * (data-reveal), so nothing stays hidden if JavaScript is slow.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.getElementById("main-content");
    const active = document.activeElement;
    if (main && (!active || active === document.body)) {
      main.focus({ preventScroll: true });
    }
  }, [pathname]);

  return (
    <div key={pathname} className="ui-page">
      {children}
    </div>
  );
}
