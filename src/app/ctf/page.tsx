import { Flag, Trophy } from "lucide-react";

import { CTFChallengeCard } from "@/components/CTFChallengeCard";
import type { PublicCTFChallenge } from "@/lib/ctf-types";
import { requireRonakId } from "@/server/current-user";
import { getCTFChallenges } from "@/server/ctf";
import { getCTFProgress } from "@/server/progress";

export default async function CTFPage() {
  const userId = await requireRonakId();

  const challenges = getCTFChallenges();
  const progress = getCTFProgress(userId);

  const solvedIds = new Set(progress.ctfIds);

  const availableXp = challenges.reduce(
    (total, challenge) => total + challenge.points,
    0,
  );

  const solvedCount = challenges.filter((challenge) =>
    solvedIds.has(challenge.id),
  ).length;

  const groups = new Map<string, PublicCTFChallenge[]>();

  for (const challenge of challenges) {
    const group = groups.get(challenge.category);

    if (group) {
      group.push(challenge);
    } else {
      groups.set(challenge.category, [challenge]);
    }
  }

  const categories = [...groups.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return (
    <>
      <header className="hero">
        <div>
          <span className="eyebrow accent">CAPTURE THE FLAG</span>
          <h1>CTF Challenges</h1>
          <p>
            Investigate the clues, discover each flag, and earn XP.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            <span
              className="accent"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Trophy size={20} aria-hidden="true" />
              <strong>
                {progress.ctfXp} / {availableXp} CTF XP
              </strong>
            </span>

            <span className="pill">
              {solvedCount} / {challenges.length} solved
            </span>
          </div>
        </div>
      </header>

      {categories.map(([category, categoryChallenges]) => (
        <section key={category} style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>
            <Flag size={18} aria-hidden="true" style={{ marginRight: "8px", verticalAlign: "middle" }} />
            {category}
          </h2>

          <div style={{ display: "grid", gap: "1rem" }}>
            {categoryChallenges.map((challenge) => (
              <CTFChallengeCard
                key={challenge.id}
                challenge={challenge}
                solved={solvedIds.has(challenge.id)}
              />
            ))}
          </div>
        </section>
      ))}

      {challenges.length === 0 && (
        <p>No CTF challenges are available yet.</p>
      )}
    </>
  );
}
