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
  const groups = new Map<string, typeof categories>();
  for (const category of categories) {
    const key = category.id;
    const group = groups.get(key) ?? [];
    group.push(category);
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

      {categories.length === 0 ? (
        <div className="ctf-empty">
          <Radar size={32} aria-hidden="true" />
          <h3>No topics yet.</h3>
        </div>
      ) : (
        categories.map((category, groupIndex) => {
          const Icon =
            category.id === "networking"
              ? Network
              : category.id === "osint"
                ? Globe2
                : category.id === "general" ? Flag : Boxes;

          const complete =
            category.challengeCount > 0 &&
            category.completedCount === category.challengeCount;

          const percentage =
            category.achievableXp > 0
              ? Math.round(
                  (category.earnedXp / category.achievableXp) * 100,
                )
              : complete ? 100 : 0;

          let challengeNumber = 0;

          return (
            <section
              key={category.id}
              className="paths-category b5-ctf-category"
              aria-labelledby={`ctf-category-${groupIndex}`}
            >
              <div className="dashboard-section-heading">
                <div>
                  <span className="dashboard-kicker">EXPLORE A CATEGORY</span>
                  <h2 id={`ctf-category-${groupIndex}`}>{category.name}</h2>
                </div>
                <span className="paths-category-count">
                  {category.challengeCount}{" "}
                  {category.challengeCount === 1 ? "challenge" : "challenges"}
                </span>
              </div>

              <ul className="ctf-category-grid">
                {category.universes.map((universe) => (
                  <li key={universe.id}>
                    <article
                      className={`ctf-category-card b5-ctf-card${
                        complete ? " is-complete" : ""
                      }`}
                    >
                      <div className="ctf-card-top">
                        <span className="ctf-category-icon" aria-hidden="true">
                          <Icon size={22} strokeWidth={1.6} />
                        </span>
                        <span className="ctf-difficulty">
                          {category.difficulty}
                        </span>
                      </div>

                      <div className="ctf-card-body">
                        <h3>
                          <Link
                            href={`/ctf/${encodeURIComponent(category.id)}`}
                            className="b5-ctf-card-link"
                          >
                            {universe.name}
                          </Link>
                        </h3>

                        <div className="ctf-card-counts">
                          <span>
                            {universe.challenges.length}{" "}
                            {universe.challenges.length === 1
                              ? "challenge"
                              : "challenges"}
                          </span>
                          <span>
                            {universe.challenges.filter((c) => c.completed).length} completed
                          </span>
                        </div>

                        <div className="b5-ctf-challenges">
                          <ul>
                            {universe.challenges.map((challenge) => {
                              challengeNumber += 1;

                              return (
                                <li key={challenge.id}>
                                  <span
                                    className="b5-ctf-challenge-status"
                                    aria-hidden="true"
                                  >
                                    {challenge.completed ? (
                                      <CheckCircle2 size={14} />
                                    ) : (
                                      <Flag size={14} />
                                    )}
                                  </span>
                                  <span>
                                    <strong>{challenge.title}</strong>
                                    <small>
                                      {challenge.completed
                                        ? "Completed"
                                        : "Ready"}
                                      {" · "}
                                      {challenge.points} XP
                                    </small>
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>

                      <div className="ctf-card-progress">
                        <div>
                          <span>Earned / achievable</span>
                          <strong>
                            {category.earnedXp}
                            <span> / {category.achievableXp} XP</span>
                          </strong>
                        </div>
                        <progress
                          value={percentage}
                          max={100}
                          aria-label={`${category.name}: ${category.earnedXp} of ${category.achievableXp} XP`}
                        />
                      </div>

                      <footer className="ctf-card-footer">
                        <span className={complete ? "ctf-text-success" : ""}>
                          {complete
                            ? "ALL CAPTURED"
                            : `${category.completedCount}/${category.challengeCount}`}
                        </span>
                        <span className="ctf-text-link" aria-hidden="true">
                          Explore
                          <ArrowRight size={15} />
                        </span>
                      </footer>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
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
