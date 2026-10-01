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

  return (
    <div className="ctf-page">
      <header className="ctf-hero">
        <div className="ctf-hero-copy">
          <span className="ctf-kicker">
            <span className="ctf-signal-dot" aria-hidden="true" />
            CYBER BOX / CAPTURE THE FLAG
          </span>
          <h1>
            Follow the signal.
            <br />
            <span>Capture the flag.</span>
          </h1>
          <p>
            Step into a story, inspect the evidence, and find what others
            missed. Every mission is a new opportunity to think like an
            investigator.
          </p>

          <div className="ctf-hero-tags">
            <span>
              <ShieldCheck size={13} aria-hidden="true" />
              Practice environments
            </span>
            <span>
              <Flag size={13} aria-hidden="true" />
              Real problem-solving
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
          <span className="ctf-radar-caption">DISCOVER / DECODE / CAPTURE</span>
        </div>
      </header>

      <dl className="ctf-stats" aria-label="Your CTF progress">
        <div>
          <dt>
            <Compass size={15} aria-hidden="true" />
            Operation categories
          </dt>
          <dd>{categories.length}</dd>
          <p>Choose your next field of investigation</p>
        </div>
        <div>
          <dt>
            <CheckCircle2 size={15} aria-hidden="true" />
            Missions completed
          </dt>
          <dd>
            {totals.completed} <span>/ {totals.challenges}</span>
          </dd>
          <p>Completed missions remain open for practice</p>
        </div>
        <div>
          <dt>
            <Trophy size={15} aria-hidden="true" />
            Your CTF XP
          </dt>
          <dd>
            {totals.earned} <span>/ {totals.achievable}</span>
          </dd>
          <p>Earned / best achievable after hint penalties</p>
        </div>
      </dl>

      <section aria-labelledby="ctf-categories-title">
        <div className="ctf-section-heading">
          <div>
            <span className="ctf-kicker">SELECT YOUR OPERATION</span>
            <h2 id="ctf-categories-title">Different fields. One mindset.</h2>
          </div>
          <span className="ctf-index-label">
            {String(categories.length).padStart(2, "0")} CATEGORIES
          </span>
        </div>

        {categories.length === 0 ? (
          <div className="ctf-empty">
            <Radar size={32} aria-hidden="true" />
            <h3>No operations on the radar yet.</h3>
            <p>New CTF categories will appear here.</p>
          </div>
        ) : (
          <ul className="ctf-category-grid">
            {categories.map((category, index) => {
              const Icon =
                category.id === "networking"
                  ? Network
                  : category.id === "osint"
                    ? Globe2
                    : category.id === "general"
                      ? Flag
                      : Boxes;

              const complete =
                category.challengeCount > 0 &&
                category.completedCount === category.challengeCount;

              const percentage =
                category.achievableXp > 0
                  ? Math.round(
                      (category.earnedXp / category.achievableXp) * 100,
                    )
                  : complete
                    ? 100
                    : 0;

              return (
                <li key={category.id}>
                  <article
                    className={`ctf-category-card${
                      complete ? " is-complete" : ""
                    }`}
                  >
                    <div className="ctf-card-top">
                      <span className="ctf-category-icon" aria-hidden="true">
                        <Icon size={25} strokeWidth={1.6} />
                      </span>
                      <span className="ctf-card-coordinate">
                        FIELD / {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="ctf-difficulty">
                        {category.difficulty}
                      </span>
                    </div>

                    <div className="ctf-card-body">
                      <h3>
                        <Link href={`/ctf/${category.id}`}>
                          {category.name}
                        </Link>
                      </h3>
                      <p>{category.description}</p>

                      <div className="ctf-card-counts">
                        <span>
                          {category.universes.length}{" "}
                          {category.universes.length === 1
                            ? "universe"
                            : "universes"}
                        </span>
                        <span>{category.challengeCount} missions</span>
                        <span>{category.completedCount} completed</span>
                      </div>

                      <div className="ctf-suggested">
                        <span className="ctf-small-label">
                          SUGGESTED LEARNING
                        </span>
                        <ul>
                          {category.suggestedPaths.map((path) => (
                            <li key={`${path.href}-${path.name}`}>
                              <Link href={path.href}>
                                {path.name}
                                <ArrowRight size={12} aria-hidden="true" />
                              </Link>
                            </li>
                          ))}
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
                        aria-label={`${category.name}: ${category.earnedXp} of ${category.achievableXp} achievable XP earned`}
                      />
                      <p>
                        {category.basePoints} base XP
                        {category.penaltyXp > 0 &&
                          ` - ${category.penaltyXp} XP in hint penalties`}
                      </p>
                    </div>

                    <footer className="ctf-card-footer">
                      <span className={complete ? "ctf-text-success" : ""}>
                        {complete ? "ALL MISSIONS CAPTURED" : "AWAITING DISCOVERY"}
                      </span>
                      <Link
                        href={`/ctf/${category.id}`}
                        className="ctf-text-link"
                        aria-label={`Explore ${category.name}`}
                      >
                        Enter field
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </footer>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside className="ctf-rules-note">
        <ShieldCheck size={21} aria-hidden="true" />
        <div>
          <strong>Intelligence has a cost. Your progress has permanence.</strong>
          <p>
            Hints reduce the available XP for their mission. Successful
            captures are recorded once, and re-attempts never duplicate
            rewards. CTF XP is separate from learning-path points.
          </p>
        </div>
      </aside>
    </div>
  );
}

