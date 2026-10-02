/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Flag,
  Orbit,
  Trophy,
  Layers3
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

  const topics = getCTFCatalogProgress(userId);
  const category = topics.find((t: any) => t.id === categoryId);

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
        </div>
        <span className="ctf-heading-symbol" aria-hidden="true">
          <Orbit size={48} strokeWidth={1.25} />
        </span>
      </header>

      <dl className="ctf-stats">
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
            Earned / achievable
          </p>
        </div>
      </dl>

      {category.ctfs.length === 0 ? (
        <div className="ctf-empty">
          <Orbit size={30} aria-hidden="true" />
          <h2>This field is still being mapped.</h2>
          <p>New missions will appear here.</p>
        </div>
      ) : (
        <div className="ctf-universe-list">
          {category.ctfs.map((ctf: any) => (
            <div key={ctf.id} className="ctf-definition-block">
              <header className="ctf-definition-heading" style={{ marginTop: "40px", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "24px", color: "white" }}>{ctf.name}</h2>
                <p style={{ color: "var(--color-text-secondary)" }}>{ctf.description}</p>
              </header>

              {ctf.universes.map((universe: any) => (
                <section
                  key={universe.id}
                  className="ctf-universe"
                  style={{ marginBottom: "30px" }}
                  aria-labelledby={`universe-${universe.id}`}
                >
                  <div className="ctf-universe-heading">
                    <div className="ctf-universe-copy">
                      <span className="ctf-kicker">UNIVERSE: {universe.name.toUpperCase()}</span>
                      <h3 id={`universe-${universe.id}`} style={{ fontSize: "18px" }}>{universe.description || "Challenges"}</h3>
                    </div>
                    <span className="ctf-universe-completion">
                      {universe.completedCount}/{universe.challengeCount} captured
                    </span>
                  </div>
                  <ul className="ctf-mission-grid">
                    {universe.challenges.map((challenge: any) => (
                      <li key={challenge.id}>
                        <Link
                          href={`/ctf/challenge/${challenge.id}`}
                          className={`ctf-mission-link${
                            challenge.state.completed ? " is-complete" : ""
                          }`}
                          aria-label={`${challenge.title}, ${
                            challenge.state.completed
                              ? `completed, ${challenge.state.awardedXp} XP earned, re-attempt`
                              : `${challenge.state.achievableXp} XP available`
                          }`}
                        >
                          <span className="ctf-mission-mark" aria-hidden="true">
                            {challenge.state.completed ? (
                              <CheckCircle2 size={19} />
                            ) : (
                              <Flag size={19} />
                            )}
                          </span>
                          <strong>{challenge.title}</strong>
                          <span className="ctf-mission-points">
                            {challenge.state.completed
                              ? challenge.state.awardedXp
                              : challenge.state.achievableXp}
                            <small>
                              {challenge.state.completed ? "XP EARNED" : "XP"}
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
                </section>
              ))}
            </div>
          ))}
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
