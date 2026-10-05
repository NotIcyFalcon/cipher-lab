import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Flag, Lightbulb, Orbit, Trophy } from "lucide-react";

import RecommendedPaths from "@/components/RecommendedPaths";
import { pathHref } from "@/lib/path-links";
import type { CTFChallengeState } from "@/lib/ctf-types";
import { getCTFCatalogProgress, type SuggestedPath } from "@/server/ctf";
import { requireRonakId } from "@/server/current-user";

type Challenge = { id: string; title: string; state: CTFChallengeState };
type Universe = {
  id: string;
  name: string;
  description: string | null;
  challenges: Challenge[];
  challengeCount: number;
  completedCount: number;
};

export default async function CTFCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const userId = await requireRonakId();
  const { category: categoryId } = await params;

  const category = getCTFCatalogProgress(userId).find((topic) => topic.id === categoryId);
  if (!category) notFound();

  return (
    <>
      <header className="ui-page-head">
        <nav aria-label="Breadcrumb">
          <ol className="ui-breadcrumb">
            <li>
              <Link href="/ctf">
                <ArrowLeft size={13} aria-hidden="true" />
                CTF
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{category.name}</li>
          </ol>
        </nav>
        <div className="ui-page-head-row">
          <div>
            <h1 className="ui-title">{category.name}</h1>
            {category.description && <p className="ui-lede">{category.description}</p>}
          </div>
        </div>
        <dl className="ui-stats" aria-label={`${category.name} progress`}>
          <div>
            <dt>
              <Flag size={14} aria-hidden="true" />
              Captured
            </dt>
            <dd>
              {category.completedCount} <span>/ {category.challengeCount}</span>
            </dd>
          </div>
          <div>
            <dt>
              <Trophy size={14} aria-hidden="true" />
              XP
            </dt>
            <dd>
              {category.earnedXp} <span>/ {category.achievableXp}</span>
            </dd>
          </div>
          <div>
            <dt>
              <Lightbulb size={14} aria-hidden="true" />
              Hint penalties
            </dt>
            <dd>{category.penaltyXp}</dd>
          </div>
        </dl>
      </header>

      {category.ctfs.length === 0 ? (
        <section className="ui-empty">
          <Orbit size={28} aria-hidden="true" />
          <h2>This topic is still being mapped</h2>
          <p>New CTFs will appear here.</p>
        </section>
      ) : (
        <div className="cat-ctf-list">
          {category.ctfs.map((ctf) => {
            const universes = ctf.universes as Universe[];

            return (
              <section key={ctf.id} id={`ctf-${ctf.id}`} className="cat-ctf-block" aria-labelledby={`ctf-title-${ctf.id}`}>
                <header className="cat-ctf-head">
                  <div>
                    <h2 id={`ctf-title-${ctf.id}`}>{ctf.name}</h2>
                    {ctf.description && <p>{ctf.description}</p>}
                  </div>
                  <div className="ui-acc-meta">
                    {ctf.difficulty && <span className="ui-badge">{ctf.difficulty}</span>}
                    <span className="ui-badge ui-num">
                      {ctf.completedCount}/{ctf.challengeCount} captured
                    </span>
                    <span className="ui-badge ui-badge-accent ui-num">
                      {ctf.earnedXp}/{ctf.achievableXp} XP
                    </span>
                  </div>
                </header>

                <RecommendedPaths
                  headingId={`recommended-${ctf.id}`}
                  paths={(ctf.suggestedPaths as SuggestedPath[]).map((path) => ({
                    ...path,
                    href: pathHref(path.id),
                  }))}
                />

                {universes.length === 0 ? (
                  <p className="ui-muted">No challenges yet.</p>
                ) : (
                  <div className="ui-accordion">
                    {universes.map((universe) => {
                      const allCaptured =
                        universe.challengeCount > 0 && universe.completedCount === universe.challengeCount;

                      return (
                        <details key={universe.id} className="ui-acc cat-universe" open={!allCaptured}>
                          <summary>
                            <span className="ui-acc-title">
                              <h3>{universe.name}</h3>
                              {universe.description && <span className="ui-muted">{universe.description}</span>}
                            </span>
                            <span className="ui-acc-meta">
                              <span className={`ui-badge ui-num${allCaptured ? " ui-badge-success" : ""}`}>
                                {universe.completedCount}/{universe.challengeCount} captured
                              </span>
                            </span>
                            <span className="ui-acc-icon" aria-hidden="true" />
                          </summary>

                          <div className="ui-acc-body">
                            <ul className="cat-challenges">
                              {universe.challenges.map((challenge) => {
                                const { completed, awardedXp, achievableXp, penaltyXp } = challenge.state;
                                const xp = completed ? awardedXp ?? 0 : achievableXp;

                                return (
                                  <li key={challenge.id}>
                                    <Link
                                      href={`/ctf/challenge/${challenge.id}`}
                                      className={`cat-challenge${completed ? " is-complete" : ""}`}
                                      aria-label={`${challenge.title}, ${
                                        completed ? `captured, ${xp} XP earned` : `${xp} XP available`
                                      }`}
                                    >
                                      <span className="cat-challenge-mark" aria-hidden="true">
                                        {completed ? <CheckCircle2 size={16} /> : <Flag size={15} />}
                                      </span>
                                      <span className="cat-challenge-title">{challenge.title}</span>
                                      <span className="cat-challenge-xp ui-num" aria-hidden="true">
                                        {xp}
                                        <small>{completed ? "XP earned" : penaltyXp > 0 ? `XP · −${penaltyXp}` : "XP"}</small>
                                      </span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <p className="ui-notice cat-footnote">
        <CheckCircle2 size={16} aria-hidden="true" />
        <span>
          <strong>Captured does not mean closed.</strong> Completed challenges stay open for re-attempts. Unsolved ones
          show the XP still available; captured ones show the XP you earned.
        </span>
      </p>
    </>
  );
}
