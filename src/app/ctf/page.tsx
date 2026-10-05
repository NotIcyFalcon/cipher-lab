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

  const openTopics = new Set(
    topics.filter((topic) => topic.completedCount > 0 && topic.completedCount < topic.challengeCount).map((topic) => topic.id),
  );
  const firstWithCtfs = topics.find((topic) => topic.ctfs.length > 0);
  if (firstWithCtfs) openTopics.add(firstWithCtfs.id);

  return (
    <>
      <header className="ui-page-head cat-hero">
        <div className="cat-hero-copy">
          <span className="ui-eyebrow">Capture the flag</span>
          <h1 className="ui-title">
            Follow the signal. <em>Capture the flag.</em>
          </h1>
          <p className="ui-lede">
            Topics hold CTFs, CTFs hold universes of challenges. Pick any challenge; captures are recorded once and
            hints lower what a challenge can still award.
          </p>
        </div>
        <dl className="cat-hero-stats" aria-label="Your CTF progress">
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
          <div className="ui-accordion cat-topics">
            {topics.map((topic, index) => {
              const Icon = TOPIC_ICONS[topic.id] ?? Boxes;

              return (
                <details key={topic.id} className="ui-acc cat-topic" open={openTopics.has(topic.id)} data-filter-group>
                  <summary>
                    <span className="ui-acc-title">
                      <span className="cat-topic-index" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
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
                      <ul className="ui-tile-grid">
                        {topic.ctfs.map((ctf) => {
                          const complete = ctf.challengeCount > 0 && ctf.completedCount === ctf.challengeCount;
                          const percentage =
                            ctf.achievableXp > 0 ? Math.round((ctf.earnedXp / ctf.achievableXp) * 100) : complete ? 100 : 0;
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
                              <article className="ui-tile cat-card">
                                <div className="cat-card-top">
                                  <span className={`cat-card-icon${complete ? " is-complete" : ""}`} aria-hidden="true">
                                    {complete ? <CheckCircle2 size={20} /> : <Icon size={20} strokeWidth={1.7} />}
                                  </span>
                                  {ctf.difficulty && <span className="cat-state-badge">{ctf.difficulty}</span>}
                                </div>

                                <div className="cat-card-body">
                                  <span className="ui-label">{topic.name}</span>
                                  <h3 className="cat-card-title">
                                    <Link
                                      href={`/ctf/${encodeURIComponent(topic.id)}#ctf-${ctf.id}`}
                                      className="ui-stretched"
                                    >
                                      {ctf.name}
                                    </Link>
                                  </h3>
                                  <p className="cat-card-sub">
                                    {plural(ctf.challengeCount, "challenge")} · {ctf.completedCount} captured
                                    {ctf.universes.length > 1 && ` · ${plural(ctf.universes.length, "universe")}`}
                                  </p>
                                  {ctf.description && <p className="cat-card-desc">{ctf.description}</p>}
                                </div>

                                <div className="cat-card-progress">
                                  <div className="cat-card-progress-head">
                                    <span>Earned / achievable</span>
                                    <strong className="ui-num">
                                      {ctf.earnedXp} <span>/ {ctf.achievableXp} XP</span>
                                    </strong>
                                  </div>
                                  <div
                                    className={`ui-meter${complete ? " is-complete" : ""}`}
                                    role="img"
                                    aria-label={`${ctf.earnedXp} of ${ctf.achievableXp} XP earned`}
                                  >
                                    <span style={{ "--value": percentage / 100 } as CSSProperties} />
                                  </div>
                                </div>

                                <footer className="cat-card-foot">
                                  <span className={complete ? "cat-card-done" : "cat-card-count"}>
                                    {complete ? "All captured" : `${ctf.completedCount}/${ctf.challengeCount}`}
                                  </span>
                                  <span className="cat-card-cta" aria-hidden="true">
                                    Explore
                                    <ArrowRight size={14} />
                                  </span>
                                </footer>
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
