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
        <section
          className="paths-category b5-ctf-category"
          aria-labelledby={`ctf-topics-grid`}
        >
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-kicker">EXPLORE TOPICS</span>
              <h2 id={`ctf-topics-grid`}>All Topics</h2>
            </div>
            <span className="paths-category-count">
              {topics.length}{" "}
              {topics.length === 1 ? "topic" : "topics"}
            </span>
          </div>

          <ul className="ctf-category-grid">
            {topics.map((topic) => {
              const Icon =
                topic.id === "networking"
                  ? Network
                  : topic.id === "osint"
                    ? Globe2
                    : topic.id === "general" ? Flag : Boxes;
              
              return (
                  <li key={topic.id}>
                    <article
                      className={`ctf-category-card b5-ctf-card${
                        (topic.challengeCount > 0 && topic.completedCount === topic.challengeCount) ? " is-complete" : ""
                      }`}
                    >
                      <div className="ctf-card-top">
                        <span className="ctf-category-icon" aria-hidden="true">
                          <Icon size={22} strokeWidth={1.6} />
                        </span>
                      </div>

                      <div className="ctf-card-body">
                        <h3>
                          <Link
                            href={`/ctf/${encodeURIComponent(topic.id)}`}
                            className="b5-ctf-card-link"
                          >
                            {topic.name}
                          </Link>
                        </h3>

                        <div className="ctf-card-counts">
                          <span>
                            {topic.challengeCount}{" "}
                            {topic.challengeCount === 1
                              ? "challenge"
                              : "challenges"}
                          </span>
                          <span>
                            {topic.completedCount} completed
                          </span>
                        </div>
                        
                        <p style={{ marginTop: "15px", marginBottom: "20px", color: "var(--color-text-secondary)", fontSize: "14px", lineHeight: "1.5" }}>
                          {topic.description}
                        </p>
                      </div>

                      <div className="ctf-card-progress">
                        <div>
                          <span>Earned / achievable</span>
                          <strong>
                            {topic.earnedXp}
                            <span> / {topic.achievableXp} XP</span>
                          </strong>
                        </div>
                        <progress
                          value={
                            topic.achievableXp > 0
                              ? Math.round((topic.earnedXp / topic.achievableXp) * 100)
                              : (topic.challengeCount > 0 && topic.completedCount === topic.challengeCount) ? 100 : 0
                          }
                          max={100}
                          aria-label={`${topic.name}: ${topic.earnedXp} of ${topic.achievableXp} XP`}
                        />
                      </div>

                      <footer className="ctf-card-footer">
                        <span className={(topic.challengeCount > 0 && topic.completedCount === topic.challengeCount) ? "ctf-text-success" : ""}>
                          {(topic.challengeCount > 0 && topic.completedCount === topic.challengeCount)
                            ? "ALL CAPTURED"
                            : `${topic.completedCount}/${topic.challengeCount}`}
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
        </section>
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
