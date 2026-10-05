import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Compass,
  Flag,
  Globe2,
  Lightbulb,
  Network,
  Radar,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import CatalogFilter from "@/components/ui/CatalogFilter";
import { getCTFCatalogProgress } from "@/server/ctf";
import { requireRonakId } from "@/server/current-user";

type Topic = ReturnType<typeof getCTFCatalogProgress>[number];

const TOPIC_ICONS: Record<string, LucideIcon> = {
  networking: Network,
  osint: Globe2,
  general: Flag,
};

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export default async function CTFPage() {
  const userId = await requireRonakId();
  const topics: Topic[] = getCTFCatalogProgress(userId);

  const totals = topics.reduce(
    (sum, topic) => ({
      ctfs: sum.ctfs + topic.ctfs.length,
      challenges: sum.challenges + topic.challengeCount,
      completed: sum.completed + topic.completedCount,
      earned: sum.earned + topic.earnedXp,
      achievable: sum.achievable + topic.achievableXp,
    }),
    { ctfs: 0, challenges: 0, completed: 0, earned: 0, achievable: 0 },
  );

  const openTopic =
    topics.find((topic) => topic.completedCount > 0 && topic.completedCount < topic.challengeCount)?.id ??
    topics.find((topic) => topic.ctfs.length > 0)?.id;

  return (
    <>
      <header className="ui-page-head">
        <span className="ui-eyebrow">Capture the flag</span>
        <div className="ui-page-head-row">
          <div>
            <h1 className="ui-title">
              Follow the signal. <em>Capture the flag.</em>
            </h1>
            <p className="ui-lede">
              Topics hold CTFs, CTFs hold universes of challenges. Pick any challenge; captures are recorded once.
            </p>
          </div>
        </div>
        <dl className="ui-stats" aria-label="Your CTF progress">
          <div>
            <dt>
              <Compass size={14} aria-hidden="true" />
              Topics
            </dt>
            <dd>{topics.length}</dd>
          </div>
          <div>
            <dt>
              <Flag size={14} aria-hidden="true" />
              CTFs
            </dt>
            <dd>{totals.ctfs}</dd>
          </div>
          <div>
            <dt>
              <CheckCircle2 size={14} aria-hidden="true" />
              Captured
            </dt>
            <dd>
              {totals.completed} <span>/ {totals.challenges}</span>
            </dd>
          </div>
          <div>
            <dt>
              <Trophy size={14} aria-hidden="true" />
              CTF XP
            </dt>
            <dd>
              {totals.earned} <span>/ {totals.achievable}</span>
            </dd>
          </div>
        </dl>
      </header>

      {topics.length === 0 ? (
        <section className="ui-empty">
          <Radar size={28} aria-hidden="true" />
          <h2>No topics yet</h2>
          <p>CTF topics appear here once they are created.</p>
        </section>
      ) : (
        <CatalogFilter
          label="Filter CTFs"
          placeholder="Search CTFs and challenges"
          categories={topics.map((topic) => ({ id: topic.id, label: topic.name, count: topic.ctfs.length }))}
        >
          <div className="ui-accordion">
            {topics.map((topic) => {
              const Icon = TOPIC_ICONS[topic.id] ?? Boxes;

              return (
                <details key={topic.id} className="ui-acc" open={topic.id === openTopic} data-filter-group>
                  <summary>
                    <span className="ui-acc-title">
                      <h2>{topic.name}</h2>
                      {topic.description && <span className="ui-muted cat-topic-desc">{topic.description}</span>}
                    </span>
                    <span className="ui-acc-meta">
                      <span className="ui-badge">{plural(topic.ctfs.length, "CTF")}</span>
                      <span className="ui-badge ui-num">
                        {topic.completedCount}/{topic.challengeCount} captured
                      </span>
                    </span>
                    <span className="ui-acc-icon" aria-hidden="true" />
                  </summary>

                  <div className="ui-acc-body">
                    {topic.ctfs.length === 0 ? (
                      <p className="ui-muted cat-none" data-filter-item data-filter-category={topic.id}>
                        No CTFs in this topic yet.
                      </p>
                    ) : (
                      <ul className="ui-list-grid">
                        {topic.ctfs.map((ctf) => {
                          const complete = ctf.challengeCount > 0 && ctf.completedCount === ctf.challengeCount;
                          const percentage =
                            ctf.challengeCount > 0 ? Math.round((ctf.completedCount / ctf.challengeCount) * 100) : 0;
                          const challengeTitles = ctf.universes
                            .flatMap((universe: { challenges: { title: string }[] }) =>
                              universe.challenges.map((challenge) => challenge.title),
                            )
                            .join(" ");

                          return (
                            <li
                              key={ctf.id}
                              data-filter-item
                              data-filter-category={topic.id}
                              data-filter-text={`${ctf.name} ${topic.name} ${ctf.difficulty ?? ""} ${challengeTitles}`}
                            >
                              <article className="ui-row cat-ctf">
                                <span className={`ui-row-icon${complete ? " is-complete" : ""}`} aria-hidden="true">
                                  {complete ? <CheckCircle2 size={17} /> : <Icon size={17} />}
                                </span>

                                <div className="ui-row-main">
                                  <h3 className="ui-row-title">
                                    <Link
                                      href={`/ctf/${encodeURIComponent(topic.id)}#ctf-${ctf.id}`}
                                      className="ui-stretched"
                                    >
                                      {ctf.name}
                                    </Link>
                                  </h3>
                                  <div className="ui-row-meta">
                                    {ctf.difficulty && <span className="ui-badge">{ctf.difficulty}</span>}
                                    <span>{plural(ctf.challengeCount, "challenge")}</span>
                                    <span>
                                      {ctf.completedCount}/{ctf.challengeCount} captured
                                    </span>
                                    {ctf.penaltyXp > 0 && (
                                      <span>
                                        <Lightbulb size={12} aria-hidden="true" />-{ctf.penaltyXp} hints
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className={`ui-meter${complete ? " is-complete" : ""}`}
                                    role="img"
                                    aria-label={`${ctf.completedCount} of ${ctf.challengeCount} challenges captured`}
                                  >
                                    <span style={{ "--value": percentage / 100 } as CSSProperties} />
                                  </div>
                                </div>

                                <div className="ui-row-end">
                                  <span className="cat-points ui-num">
                                    {ctf.earnedXp}
                                    <small>/{ctf.achievableXp} XP</small>
                                  </span>
                                  <span className="ui-arrow" aria-hidden="true">
                                    <ArrowRight size={16} />
                                  </span>
                                </div>
                              </article>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </CatalogFilter>
      )}

      <p className="ui-notice cat-footnote">
        <Lightbulb size={16} aria-hidden="true" />
        <span>
          <strong>Hints reduce the XP a challenge can still award.</strong> Captured challenges stay open for
          re-attempts and keep the XP you earned.
        </span>
      </p>
    </>
  );
}
