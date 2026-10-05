"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import BootLoader from "@/components/showcase/BootLoader";
import type { Stage, StageState } from "@/components/showcase/stage";
import { displayFont } from "@/components/showcase/fonts";

export type ShowcaseData = {
  operator: string;
  level: number;
  totalXp: number;
  streak: number;
  nextTarget: { title: string; href: string } | null;
};

const BOOT_KEY = "cbx:boot-seen";
const EYEBROW = "Root access & the terminal present";

/* ---------- small external-store hooks (no setState in effects) ---------- */

const noop = () => () => {};

function readBootSeen() {
  try {
    return window.sessionStorage.getItem(BOOT_KEY) === "1" ? "seen" : "unseen";
  } catch {
    return "unseen";
  }
}

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function subscribeClock(callback: () => void) {
  const id = window.setInterval(callback, 1000);
  return () => window.clearInterval(id);
}

const timeNow = () => new Date().toTimeString().slice(0, 8);

const number = (value: number) => value.toLocaleString("en-US");

/* ---------- nav visibility (shared with SiteNav through a data attribute) ---------- */

function setNav(shown: boolean) {
  const root = document.documentElement;
  const value = shown ? "shown" : "hidden";
  if (root.dataset.navState !== value) root.dataset.navState = value;
}

export default function DashboardShowcase({ data }: { data: ShowcaseData }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const targets = useRef<StageState>({
    intro: 0,
    drive: 0,
    heroFade: 0,
    city: 0,
    cityProgress: 0,
    pointerX: 0,
    pointerY: 0,
  });

  const bootSeen = useSyncExternalStore<"seen" | "unseen" | "pending">(noop, readBootSeen, () => "pending");
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const clock = useSyncExternalStore(subscribeClock, timeNow, () => "--:--:--");

  const [entered, setEntered] = useState(false);
  const [stageReady, setStageReady] = useState(false);

  const live = bootSeen === "seen" || entered;
  const phase = bootSeen === "pending" ? "pending" : live ? "live" : "boot";

  /* Stage: load three.js lazily, render into the sticky canvas. */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.page = "showcase";
    setNav(false);

    const canvas = canvasRef.current;
    const lite = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;

    import("@/components/showcase/stage")
      .then(({ createStage }) => {
        if (disposed || !canvas) return;
        const stage = createStage(canvas, targets.current, { lite, reduced: reducedMotion });
        stageRef.current = stage;
        stage.start();
        return document.fonts?.ready;
      })
      .catch(() => {
        // No WebGL: the CSS fallback behind the canvas takes over.
        rootRef.current?.setAttribute("data-stage", "failed");
      })
      .finally(() => {
        if (!disposed) setStageReady(true);
      });

    const onPointer = (event: PointerEvent) => {
      targets.current.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      targets.current.pointerY = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      disposed = true;
      window.removeEventListener("pointermove", onPointer);
      stageRef.current?.dispose();
      stageRef.current = null;
      delete root.dataset.page;
      delete root.dataset.navState;
    };
  }, []);

  /* Hold the page still while the session record is on screen. */
  useEffect(() => {
    if (phase !== "boot" && phase !== "pending") return;
    const lenis = window.__cyberboxLenis;
    lenis?.stop();
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = overflow;
      lenis?.start();
    };
  }, [phase]);

  /* Scroll choreography. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);

    // Lenis moves the page; keep ScrollTrigger in step with it.
    const unsubscribe = window.__cyberboxLenis?.on("scroll", () => ScrollTrigger.update());

    const t = targets.current;
    const hero = root.querySelector<HTMLElement>(".sc-hero")!;
    const city = root.querySelector<HTMLElement>(".sc-city")!;
    let pastEnd = false;

    const context = gsap.context(() => {
      const smoothstep = (a: number, b: number, v: number) => {
        const x = Math.min(1, Math.max(0, (v - a) / (b - a)));
        return x * x * (3 - 2 * x);
      };

      ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        end: "bottom bottom",
        onUpdate(self) {
          const p = self.progress;
          t.drive = reduced ? 0.3 : p;
          t.heroFade = smoothstep(0.7, 1, p);
          t.city = smoothstep(0.8, 1, p);
        },
      });

      ScrollTrigger.create({
        trigger: city,
        start: "top top",
        end: "bottom bottom",
        onUpdate(self) {
          t.cityProgress = reduced ? 1 : self.progress;
        },
      });

      // The site navigation hides while you descend and slides back at the end.
      ScrollTrigger.create({
        trigger: city,
        start: "bottom-=12% bottom",
        onEnter: () => {
          pastEnd = true;
          setNav(true);
        },
        onLeaveBack: () => {
          pastEnd = false;
        },
      });
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate(self) {
          if (root.dataset.intro !== "done") return;
          const y = self.scroll();
          setNav(pastEnd || y < 40 || self.direction < 0);
        },
      });

      if (reduced) return;

      gsap
        .timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom bottom", scrub: 0.6 } })
        .to(".sc-cue", { autoAlpha: 0, y: 24, duration: 0.08, ease: "none" }, 0)
        .to(
          ".sc-hero-center",
          { yPercent: -24, scale: 0.92, filter: "blur(14px)", autoAlpha: 0, duration: 0.33, ease: "power1.in" },
          0.55,
        );

      const lines = gsap.utils.toArray<HTMLElement>(".sc-lede > span");
      const timeline = gsap.timeline({
        scrollTrigger: { trigger: city, start: "top top", end: "bottom bottom", scrub: 0.6 },
        defaults: { ease: "none" },
      });
      timeline.fromTo(".sc-kicker", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05 }, 0.02);
      const lineStarts = [0.04, 0.2, 0.4];
      const lineLengths = [0.18, 0.26, 0.48];
      lines.forEach((line, index) => {
        timeline.fromTo(
          line,
          { autoAlpha: 0, filter: "blur(18px)", letterSpacing: "0.32em", x: -12 },
          { autoAlpha: 1, filter: "blur(0px)", letterSpacing: "0.005em", x: 0, duration: lineLengths[index] },
          lineStarts[index],
        );
      });
      timeline.fromTo(".sc-body p", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, stagger: 0.06, duration: 0.12 }, 0.18);
      timeline.fromTo(".sc-credits > div", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.04, duration: 0.1 }, 0.32);
      timeline.fromTo(".sc-route-status li", { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, stagger: 0.04, duration: 0.08 }, 0.44);
      timeline.fromTo(".sc-lock", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, 0.5);
      gsap.utils.toArray<HTMLElement>(".sc-hud").forEach((hud, index) => {
        timeline.fromTo(hud, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.3 + index * 0.13);
      });
    }, root);

    // Fonts change line heights; measure again once they are in.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      unsubscribe?.();
      context.revert();
    };
  }, [reduced]);

  /* Intro: the car pulls up and the title develops out of the fog. */
  useEffect(() => {
    if (phase !== "live") return;
    const root = rootRef.current;
    if (!root) return;
    const t = targets.current;
    const finish = () => {
      root.dataset.intro = "done";
      setNav(window.scrollY < 40);
    };

    if (reduced) {
      t.intro = 1;
      gsap.set(root.querySelectorAll("[data-intro]"), { autoAlpha: 1 });
      finish();
      return;
    }

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ delay: 0.1 });
      timeline.to(t, { intro: 1, duration: 3.4, ease: "power2.out" }, 0);
      timeline.fromTo('[data-intro="eyebrow"]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.5);
      timeline.to('[data-intro="eyebrow"]', { duration: 1.3, scrambleText: { text: EYEBROW, chars: "upperCase", speed: 0.5 } }, 0.5);
      timeline.fromTo(
        '[data-intro="title"]',
        { autoAlpha: 0, scale: 1.08, filter: "blur(22px)" },
        { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 1.7, ease: "power3.out" },
        0.8,
      );
      timeline.fromTo('[data-intro="line"]', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.7 }, 1.5);
      timeline.fromTo('[data-intro="action"]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.7 }, 1.9);
      timeline.fromTo('[data-intro="cue"]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 2.3);
      timeline.call(finish, [], 1.7);
    }, root);

    return () => context.revert();
  }, [phase, reduced]);

  const enter = () => {
    try {
      window.sessionStorage.setItem(BOOT_KEY, "1");
    } catch {
      // Private mode: the record simply plays again next time.
    }
    window.scrollTo(0, 0);
    setEntered(true);
  };

  return (
    <div ref={rootRef} className={`sc ${displayFont.variable}`} data-phase={phase}>
      <svg className="sc-defs" aria-hidden="true" focusable="false">
        <filter id="sc-grunge" x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="speckle" />
          <feColorMatrix
            in="speckle"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 1.75"
            result="holes"
          />
          <feComposite in="SourceGraphic" in2="holes" operator="in" result="worn" />
          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.35" numOctaves="2" seed="3" result="cracks" />
          <feDisplacementMap in="worn" in2="cracks" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {bootSeen === "pending" && <div className="sc-boot" aria-hidden="true" />}
      {bootSeen === "unseen" && (
        <BootLoader
          operator={data.operator}
          ready={stageReady}
          instant={reduced}
          leaving={entered}
          onEnter={enter}
        />
      )}

      <div className="sc-stage-wrap">
        <div className="sc-fallback" aria-hidden="true" />
        <canvas ref={canvasRef} className="sc-stage" aria-hidden="true" />

        <section className="sc-hero" aria-labelledby="sc-title">
          <div className="sc-pin">
            <div className="sc-hero-center">
              <p className="sc-eyebrow" data-intro="eyebrow">
                {EYEBROW}
              </p>
              <h1 id="sc-title" className="sc-title" data-intro="title">
                <span>Cyber Box</span>
              </h1>
              <p className="sc-formats" data-intro="line">
                In Linux, networks <b>&amp;</b> the cloud
              </p>
              <p className="sc-tagline" data-intro="line">
                Learn to break. Learn to defend.
              </p>
              <p className="sc-date" data-intro="line">
                Basics of Hacking
              </p>
              <div className="sc-actions">
                <Link href="/paths" className="sc-btn sc-btn--primary" data-intro="action" data-label="Explore">
                  <span className="sc-btn-label">Explore</span>
                </Link>
                <Link href="/ctf" className="sc-btn sc-btn--frame" data-intro="action">
                  <svg className="sc-btn-frame" viewBox="0 0 200 56" preserveAspectRatio="none" aria-hidden="true">
                    <rect className="is-base" x="1" y="1" width="198" height="54" />
                    <rect className="is-draw" x="1" y="1" width="198" height="54" pathLength={100} />
                  </svg>
                  <span className="sc-btn-label">Practice</span>
                </Link>
              </div>
            </div>

            <div className="sc-cue">
              <div className="sc-cue-inner" data-intro="cue">
                <span>Scroll</span>
                <i aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section className="sc-city" aria-labelledby="sc-city-title">
          <div className="sc-pin">
            <div className="sc-city-grid">
              <p className="sc-kicker">Briefing · Manifest 0x7E1-B</p>

              <h2 id="sc-city-title" className="sc-lede">
                <span>Cyber Box.</span>
                <span>Cyber Security</span>
                <span>In a Box.</span>
              </h2>

              <div className="sc-body">
                <p>
                  Every path here runs like an engagement: read the brief, open a shell, break something that was built
                  to be broken. The labs are real containers, so mistakes cost nothing.
                </p>
                <p>
                  From your first <code>ls -la</code> to hardened pipelines: Linux, networking, web exploitation and
                  DevOps. When the notes run out, the flags begin.
                </p>
              </div>

              <dl className="sc-credits">
                <div>
                  <dt>Operator</dt>
                  <dd>{data.operator}</dd>
                </div>
                <div>
                  <dt>Clearance</dt>
                  <dd>
                    Level {data.level} · {number(data.totalXp)} XP
                  </dd>
                </div>
                <div>
                  <dt>Streak</dt>
                  <dd>
                    {data.streak} {data.streak === 1 ? "day" : "days"}
                  </dd>
                </div>
                <div>
                  <dt>Next target</dt>
                  <dd>
                    {data.nextTarget ? (
                      <Link href={data.nextTarget.href}>{data.nextTarget.title}</Link>
                    ) : (
                      <Link href="/ctf">Capture a flag</Link>
                    )}
                  </dd>
                </div>
              </dl>

              <ul className="sc-route-status">
                <li>Origin · Recon</li>
                <li>Destination · Root access</li>
                <li className="is-alert">Pipeline status · Deployed</li>
              </ul>

              <p className="sc-lock">
                <span>Session lock</span>
                <time suppressHydrationWarning>{clock}</time>
              </p>

              <p className="sc-hud sc-hud--a">
                <span>00:42</span>
                <span>Perimeter</span>
              </p>
              <p className="sc-hud sc-hud--b">
                <span>02:13</span>
                <span>Firewall bypassed</span>
              </p>
              <p className="sc-hud sc-hud--c">
                <span>Root shell</span>
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="sc-grain" aria-hidden="true" />
    </div>
  );
}
