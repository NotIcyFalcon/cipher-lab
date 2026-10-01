import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CTFChallengeCard } from "@/components/CTFChallengeCard";
import { requireRonakId } from "@/server/current-user";
import { getCTFChallenge } from "@/server/ctf";
import { getCTFProgress } from "@/server/progress";

export default async function CTFChallengePage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const userId = await requireRonakId();
  const { challengeId } = await params;

  const challenge = getCTFChallenge(challengeId);

  if (!challenge) {
    notFound();
  }

  const progress = getCTFProgress(userId);

  return (
    <>
      <div style={{ paddingTop: "24px" }}>
        <Link
          href="/ctf"
          className="secondary-button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          All CTF challenges
        </Link>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <CTFChallengeCard
          key={challenge.id}
          challenge={challenge}
          solved={progress.ctfIds.includes(challenge.id)}
          standalone
        />
      </div>
    </>
  );
}
