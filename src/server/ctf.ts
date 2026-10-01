import "server-only";

import {
  ctfCategories,
  type CTFChallengeDefinition,
} from "@/content/ctf-catalog";
import type { CTFChallengeState } from "@/lib/ctf-types";
import { getDb } from "@/server/db";

type CompletionRow = {
  challengeId: string;
  awardedXp: number;
};

type HintRow = {
  challengeId: string;
  hintIndex: number;
};

type CTFAccountData = {
  completions: Map<string, number>;
  hints: Map<string, Set<number>>;
};

function readCTFAccountData(userId: string): CTFAccountData {
  const db = getDb();

  const completions = db
    .prepare(`
      SELECT
        challenge_id AS challengeId,
        awarded_xp AS awardedXp
      FROM ctf_completions
      WHERE user_id = ?
    `)
    .all(userId) as CompletionRow[];

  const unlocks = db
    .prepare(`
      SELECT
        challenge_id AS challengeId,
        hint_index AS hintIndex
      FROM ctf_hint_unlocks
      WHERE user_id = ?
    `)
    .all(userId) as HintRow[];

  const hints = new Map<string, Set<number>>();

  for (const unlock of unlocks) {
    const indexes = hints.get(unlock.challengeId) ?? new Set<number>();
    indexes.add(unlock.hintIndex);
    hints.set(unlock.challengeId, indexes);
  }

  return {
    completions: new Map(
      completions.map((row) => [row.challengeId, row.awardedXp]),
    ),
    hints,
  };
}

function calculateState(
  challenge: CTFChallengeDefinition,
  account: CTFAccountData,
): CTFChallengeState {
  const unlocked = account.hints.get(challenge.id) ?? new Set<number>();
  const completed = account.completions.has(challenge.id);
  const awardedXp = account.completions.get(challenge.id) ?? null;

  const penaltyXp = challenge.hints.reduce(
    (sum, hint, index) =>
      sum + (unlocked.has(index) ? hint.penalty : 0),
    0,
  );

  return {
    completed,
    awardedXp,
    basePoints: challenge.points,
    penaltyXp,
    // A solved challenge retains its recorded score.
    achievableXp: completed
      ? awardedXp!
      : Math.max(0, challenge.points - penaltyXp),
    hints: challenge.hints.map((hint, index) => ({
      index,
      penalty: hint.penalty,
      unlocked: unlocked.has(index),
      text: unlocked.has(index) ? hint.text : null,
    })),
  };
}

export function getCTFChallengeState(
  userId: string,
  challenge: CTFChallengeDefinition,
): CTFChallengeState {
  return calculateState(challenge, readCTFAccountData(userId));
}

/**
 * Explicit public projection. No flag or locked hint text is returned.
 */
export function getCTFCatalogProgress(userId: string) {
  const account = readCTFAccountData(userId);

  return ctfCategories.map((category) => {
    const universes = category.universes.map((universe) => ({
      id: universe.id,
      name: universe.name,
      description: universe.description,
      challenges: universe.challenges.map((challenge) => {
        const state = calculateState(challenge, account);

        return {
          id: challenge.id,
          title: challenge.title,
          points: challenge.points,
          completed: state.completed,
          earnedXp: state.awardedXp ?? 0,
          achievableXp: state.achievableXp,
          penaltyXp: state.penaltyXp,
        };
      }),
    }));

    const challenges = universes.flatMap((universe) => universe.challenges);

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      difficulty: category.difficulty,
      suggestedPaths: category.suggestedPaths.map((path) => ({
        name: path.name,
        href: path.href,
      })),
      universes,
      challengeCount: challenges.length,
      completedCount: challenges.filter((challenge) => challenge.completed)
        .length,
      earnedXp: challenges.reduce(
        (sum, challenge) => sum + challenge.earnedXp,
        0,
      ),
      achievableXp: challenges.reduce(
        (sum, challenge) => sum + challenge.achievableXp,
        0,
      ),
      basePoints: challenges.reduce(
        (sum, challenge) => sum + challenge.points,
        0,
      ),
      penaltyXp: challenges.reduce(
        (sum, challenge) => sum + challenge.penaltyXp,
        0,
      ),
    };
  });
}
