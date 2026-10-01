import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  FileSearch,
  Flag,
  ShieldCheck,
  Terminal,
} from "lucide-react";

import CTFChallengePanel from "@/components/CTFChallengePanel";
import LabTerminal from "@/components/LabTerminal";
import { findCTFChallenge } from "@/content/ctf-catalog";
import { getCTFChallengeState } from "@/server/ctf";
import { requireRonakId } from "@/server/current-user";

export default async function CTFChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireRonakId();
  const { id } = await params;

  const entry = findCTFChallenge(id);

  if (!entry) notFound();

  const { category, universe, challenge } = entry;
  const state = getCTFChallengeState(userId, challenge);

  return (
    <div className="ctf-page ctf-challenge-page">
      <nav className="ctf-route-bar" aria-label="CTF navigation">
        <Link
          href={`/ctf/${category.id}`}
          className="ctf-button ctf-button-quiet"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to {category.name}
        </Link>

        <div className="ctf-breadcrumb">
          <Link href="/ctf">CTF</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <Link href={`/ctf/${category.id}`}>{category.name}</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span aria-current="page">Mission</span>
        </div>
      </nav>

      <header className="ctf-challenge-heading">
        <div className="ctf-challenge-title">
          <span className="ctf-kicker">{universe.name}</span>
          <h1>{challenge.title}</h1>

          <div className="ctf-challenge-meta">
            <span className="ctf-difficulty">{category.difficulty}</span>
            <span>
              <Flag size={13} aria-hidden="true" />
              {category.name}
            </span>
            {challenge.labId && (
              <span>
                <Terminal size={13} aria-hidden="true" />
                Interactive environment
              </span>
            )}
            {state.completed && (
              <span className="ctf-captured-badge">
                <CheckCircle2 size={13} aria-hidden="true" />
                Captured
              </span>
            )}
          </div>
        </div>

        <div className="ctf-score-plate">
          <span>
            {state.completed ? "RECORDED REWARD" : "AVAILABLE REWARD"}
          </span>
          <strong>
            {state.completed ? state.awardedXp : state.achievableXp}
            <small> XP</small>
          </strong>
          <p>
            {challenge.points} base
            {state.penaltyXp > 0 && ` · −${state.penaltyXp} hints`}
          </p>
        </div>
      </header>

      <section
        className="ctf-briefing"
        aria-labelledby="ctf-briefing-title"
      >
        <div className="ctf-panel-bar">
          <span className="ctf-panel-label" id="ctf-briefing-title">
            <FileSearch size={15} aria-hidden="true" />
            MISSION BRIEFING
          </span>
          <span className="ctf-mono-note">READ / INVESTIGATE / CAPTURE</span>
        </div>

        <div className="ctf-briefing-body">
          <p>{challenge.description}</p>
        </div>
      </section>

      {challenge.labId && (
        <section
          className="ctf-lab-section"
          aria-labelledby="ctf-lab-title"
        >
          <div className="ctf-section-heading">
            <div>
              <span className="ctf-kicker">MISSION ENVIRONMENT</span>
              <h2 id="ctf-lab-title">Your investigation console.</h2>
            </div>
            <Terminal size={23} aria-hidden="true" />
          </div>

          <p className="ctf-lab-note">
            Use this environment to investigate the mission. CTF XP is
            awarded by the flag form below—not by connecting to the terminal.
          </p>

          <div className="ctf-lab">
            <LabTerminal
              labId={challenge.labId}
              title={challenge.title}
            />
          </div>
        </section>
      )}

      <CTFChallengePanel
        key={challenge.id}
        challengeId={challenge.id}
        initialState={state}
      />

      <aside className="ctf-rules-note">
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <strong>Keep your investigation in scope.</strong>
          <p>
            Work only with the provided artifacts and authorized challenge
            environments. External systems are not part of the mission
            unless the briefing explicitly identifies them as authorized.
          </p>
        </div>
      </aside>
    </div>
  );
}
