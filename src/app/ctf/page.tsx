/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Compass,
  Flag,
  Globe2,
  Network,
  Radar,
  ShieldCheck,
  Trophy,
} from "lucide-react";

import { getCTFCatalogProgress } from "@/server/ctf";
import { requireRonakId } from "@/server/current-user";

export default async function CTFPage() {
  const userId = await requireRonakId();
  const categories = getCTFCatalogProgress(userId);

  const totals = categories.reduce(
    (sum, category) => ({
      challenges: sum.challenges + category.challengeCount,
      completed: sum.completed + category.completedCount,
      earned: sum.earned + category.earnedXp,
      achievable: sum.achievable + category.achievableXp,
    }),
    { challenges: 0, completed: 0, earned: 0, achievable: 0 },
  );

  // Group categories by their difficulty as a simple grouping mechanism,
  // similar to how Learning Paths groups by category.
  const topics = categories; // renaming for clarity below

  const groups = new Map<string, typeof topics>();
  for (const topic of topics) {
    const key = topic.id;
    const group = groups.get(key) ?? [];
    group.push(topic);
    groups.set(key, group);
  }

  return (
    <div className="ctf-page b5-ctf">
      <header className="ctf-hero">
        <div className="ctf-hero-copy">
          <span className="ctf-kicker">
            <span className="ctf-signal-dot" aria-hidden="true" />
            CAPTURE THE FLAG
          </span>
          <h1>
            Follow the signal.
            <br />
            <span>Capture the flag.</span>
          </h1>

          <div className="ctf-hero-tags">
            <span>
              <ShieldCheck size={13} aria-hidden="true" />
              Practice environments
            </span>
            <span>
              <Flag size={13} aria-hidden="true" />
              Topics → Universes → Challenges
            </span>
          </div>
        </div>

        <div className="ctf-radar-art" aria-hidden="true">
          <span className="ctf-radar-ring ctf-radar-ring-one" />
          <span className="ctf-radar-ring ctf-radar-ring-two" />
          <span className="ctf-radar-axis ctf-radar-axis-x" />
          <span className="ctf-radar-axis ctf-radar-axis-y" />
          <span className="ctf-radar-core">
            <Radar size={49} strokeWidth={1.2} />
          </span>
          <span className="ctf-radar-node" />
        </div>
      </header>

      <dl className="ctf-stats" aria-label="Your CTF progress">
        <div>
          <dt>
            <Compass size={15} aria-hidden="true" />
            Topics
          </dt>
          <dd>{categories.length}</dd>
        </div>
        <div>
          <dt>
            <CheckCircle2 size={15} aria-hidden="true" />
            Completed
          </dt>
          <dd>
            {totals.completed} <span>/ {totals.challenges}</span>
          </dd>
        </div>
        <div>
          <dt>
            <Trophy size={15} aria-hidden="true" />
            CTF XP
          </dt>
          <dd>
            {totals.earned} <span>/ {totals.achievable}</span>
          </dd>
        </div>
      </dl>

      {topics.length === 0 ? (
        <div className="ctf-empty">
          <Radar size={32} aria-hidden="true" />
          <h3>No topics yet.</h3>
        </div>
      ) : (
        topics.map((topic) => (
          <section
            key={topic.id}
            className="paths-category b5-ctf-category"
            aria-labelledby={`ctf-topic-${topic.id}`}
          >
            <div className="dashboard-section-heading">
              <div>
                <span className="dashboard-kicker">{topic.description || "EXPLORE"}</span>
                <h2 id={`ctf-topic-${topic.id}`}>{topic.name}</h2>
              </div>
              <span className="paths-category-count">
                {topic.ctfs.length}{" "}
                {topic.ctfs.length === 1 ? "CTF" : "CTFs"}
              </span>
            </div>

            {topic.ctfs.length === 0 ? (
              <p style={{ color: "var(--color-text-secondary)" }}>No CTFs in this topic yet.</p>
            ) : (
              <ul className="ctf-category-grid">
                {topic.ctfs.map((ctf: any) => {
                  const Icon =
                    topic.id === "networking"
                      ? Network
                      : topic.id === "osint"
                        ? Globe2
                        : topic.id === "general" ? Flag : Boxes;
                  
                  return (
                      <li key={ctf.id}>
                        <article
                          className={`ctf-category-card b5-ctf-card${
                            (ctf.challengeCount > 0 && ctf.completedCount === ctf.challengeCount) ? " is-complete" : ""
                          }`}
                        >
                          <div className="ctf-card-top">
                            <span className="ctf-category-icon" aria-hidden="true">
                              <Icon size={22} strokeWidth={1.6} />
                            </span>
                            {ctf.difficulty && (
                              <span className="ctf-card-difficulty">{ctf.difficulty}</span>
                            )}
                          </div>

                          <div className="ctf-card-body">
                            <h3>
                              <Link
                                href={`/ctf/${encodeURIComponent(topic.id)}#ctf-${ctf.id}`}
                                className="b5-ctf-card-link"
                              >
                                {ctf.name}
                              </Link>
                            </h3>

                            <div className="ctf-card-counts">
                              <span>
                                {ctf.challengeCount}{" "}
                                {ctf.challengeCount === 1
                                  ? "challenge"
                                  : "challenges"}
                              </span>
                              <span>
                                {ctf.completedCount} completed
                              </span>
                            </div>
                            
                            <p style={{ marginTop: "15px", marginBottom: "20px", color: "var(--color-text-secondary)", fontSize: "14px", lineHeight: "1.5" }}>
                              {ctf.description}
                            </p>
                          </div>

                          <div className="ctf-card-progress">
                            <div>
                              <span>Earned / achievable</span>
                              <strong>
                                {ctf.earnedXp}
                                <span> / {ctf.achievableXp} XP</span>
                              </strong>
                            </div>
                            <progress
                              value={
                                ctf.achievableXp > 0
                                  ? Math.round((ctf.earnedXp / ctf.achievableXp) * 100)
                                  : (ctf.challengeCount > 0 && ctf.completedCount === ctf.challengeCount) ? 100 : 0
                              }
                              max={100}
                              aria-label={`${ctf.name}: ${ctf.earnedXp} of ${ctf.achievableXp} XP`}
                            />
                          </div>

                          <footer className="ctf-card-footer">
                            <span className={(ctf.challengeCount > 0 && ctf.completedCount === ctf.challengeCount) ? "ctf-text-success" : ""}>
                              {(ctf.challengeCount > 0 && ctf.completedCount === ctf.challengeCount)
                                ? "ALL CAPTURED"
                                : `${ctf.completedCount}/${ctf.challengeCount}`}
                            </span>
                            <span className="ctf-text-link" aria-hidden="true">
                              Explore
                              <ArrowRight size={15} />
                            </span>
                          </footer>
                        </article>
                      </li>
                    );
                })}
              </ul>
            )}
          </section>
        ))
      )}

      <aside className="ctf-rules-note">
        <ShieldCheck size={21} aria-hidden="true" />
        <div>
          <strong>Hints reduce available XP. Captures are recorded once.</strong>
        </div>
      </aside>
    </div>
  );
}
