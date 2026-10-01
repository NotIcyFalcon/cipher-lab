import "server-only";

import {
  ctfChallenges,
  type CTFChallenge,
} from "@/content/ctf-challenges";
import type { PublicCTFChallenge } from "@/lib/ctf-types";
import { getDb } from "@/server/db";

function toPublicChallenge(
  challenge: CTFChallenge,
): PublicCTFChallenge {
  // Explicit projection: never spread the server-side challenge object.
  const publicChallenge: PublicCTFChallenge = {
    id: challenge.id,
    title: challenge.title,
    category: challenge.category,
    difficulty: challenge.difficulty,
    points: challenge.points,
    description: challenge.description,
  };

  if (challenge.hint !== undefined) {
    publicChallenge.hint = challenge.hint;
  }

  if (challenge.labId !== undefined) {
    publicChallenge.labId = challenge.labId;
  }

  return publicChallenge;
}

export function getCTFChallenges(): PublicCTFChallenge[] {
  return ctfChallenges.map(toPublicChallenge);
}

export function getCTFChallenge(
  challengeId: string,
): PublicCTFChallenge | undefined {
  const challenge = ctfChallenges.find(
    (candidate) => candidate.id === challengeId,
  );

  return challenge ? toPublicChallenge(challenge) : undefined;
}

// Called by the Server Action only after successful flag validation.
export function recordCTFCompletion(
  userId: string,
  challengeId: string,
): {
  created: boolean;
  awardedXp: number;
} {
  const challenge = ctfChallenges.find(
    (candidate) => candidate.id === challengeId,
  );

  if (!challenge) {
    throw new Error("Unknown CTF challenge.");
  }

  const result = getDb()
    .prepare(`
      INSERT INTO ctf_completions (user_id, challenge_id, xp)
      VALUES (?, ?, ?)
      ON CONFLICT (user_id, challenge_id) DO NOTHING
    `)
    .run(userId, challenge.id, challenge.points);

  const created = result.changes === 1;

  return {
    created,
    awardedXp: created ? challenge.points : 0,
  };
}
