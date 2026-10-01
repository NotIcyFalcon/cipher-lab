import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Flag,
  Layers3,
  Orbit,
  Trophy,
} from "lucide-react";

import { getCTFCatalogProgress } from "@/server/ctf";
import { requireRonakId } from "@/server/current-user";

export default async function CTFCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const userId = await requireRonakId();
  const { category: categoryId } = await params;

  const category = getCTFCatalogProgress(userId).find(
    (item) => item.id === categoryId,
  );

  if (!category) notFound();

  return (
    <div className="ctf-page">
      <nav className="ctf-route-bar" aria-label="CTF navigation">
        <Link href="/ctf" className="ctf-button ctf-button-quiet">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to CTFs
        </Link>

        <div className="ctf-breadcrumb">
          <Link href="/ctf">CTF</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span aria-current="page">{category.name}</span>
        </div>
      </nav>

      <header className="ctf-category-heading">
        <div>
          <span className="ctf-kicker">OPERATION FIELD / {category.id}</span>
          <h1>{category.name}</h1>
          <p>{category.description}</p>
          <span className="ctf-difficulty">{category.difficulty}</span>
        </div>
        <span className="ctf-heading-symbol" aria-hidden="true">
          <Orbit size={48} strokeWidth={1.25} />
        </span>
      </header>

      <dl className="ctf-stats">
        <div>
          <dt>
            <Layers3 size={15} aria-hidden="true" />
            Story universes
          </dt>
          <dd>{category.universes.length}</dd>
          <p>Connected missions with a shared story</p>
        </div>
        <div>
          <dt>
            <Flag size={15} aria-hidden="true" />
            Captured missions
          </dt>
          <dd>
            {category.completedCount} <span>/ {category.challengeCount}</span>
          </dd>
          <p>Choose any mission to investigate</p>
        </div>
        <div>
          <dt>
            <Trophy size={15} aria-hidden="true" />
            Field XP
          </dt>
          <dd>
            {category.earnedXp} <span>/ {category.achievableXp}</span>
          </dd>
          <p>
            Earned / achievable · {category.basePoints} base XP
          </p>
        </div>
      </dl>

      {category.universes.length === 0 ? (
        <div className="ctf-empty">
          <Orbit size={30} aria-hidden="true" />
          <h2>This field is still being mapped.</h2>
          <p>New universes will appear here.</p>
        </div>
      ) : (
        <div className="ctf-universe-list">
          {category.universes.map((universe, index) => {
            const completed = universe.challenges.filter(
              (challenge) => challenge.completed,
            ).length;

            return (
              <section
                className="ctf-universe"
                key={universe.id}
                aria-labelledby={`universe-${universe.id}`}
              >
                <div className="ctf-universe-heading">
                  <span className="ctf-universe-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="ctf-universe-copy">
                    <span className="ctf-kicker">STORY UNIVERSE</span>
                    <h2 id={`universe-${universe.id}`}>{universe.name}</h2>
                    <p>{universe.description}</p>
                  </div>

                  <span className="ctf-universe-completion">
                    {completed}/{universe.challenges.length} captured
                  </span>
                </div>

                {universe.challenges.length === 0 ? (
                  <div className="ctf-empty-inline">
                    Missions for this universe are on their way.
                  </div>
                ) : (
                  <ul className="ctf-mission-grid">
                    {universe.challenges.map((challenge) => (
                      <li key={challenge.id}>
                        <Link
                          href={`/ctf/challenge/${challenge.id}`}
                          className={`ctf-mission-link${
                            challenge.completed ? " is-complete" : ""
                          }`}
                          aria-label={`${challenge.title}, ${
                            challenge.completed
                              ? `completed, ${challenge.earnedXp} XP earned, re-attempt`
                              : `${challenge.achievableXp} XP available`
                          }`}
                        >
                          <span className="ctf-mission-mark" aria-hidden="true">
                            {challenge.completed ? (
                              <CheckCircle2 size={19} />
                            ) : (
                              <Flag size={19} />
                            )}
                          </span>
                          <strong>{challenge.title}</strong>
                          <span className="ctf-mission-points">
                            {challenge.completed
                              ? challenge.earnedXp
                              : challenge.achievableXp}
                            <small>
                              {challenge.completed ? "XP EARNED" : "XP"}
                            </small>
                          </span>
                          <ArrowRight
                            className="ctf-mission-arrow"
                            size={16}
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <aside className="ctf-rules-note">
        <CheckCircle2 size={20} aria-hidden="true" />
        <div>
          <strong>Captured does not mean closed.</strong>
          <p>
            Completed missions stay clickable for re-attempts. Unsolved
            missions show their currently achievable XP; captured missions
            show the XP you earned.
          </p>
        </div>
      </aside>
    </div>
  );
}
