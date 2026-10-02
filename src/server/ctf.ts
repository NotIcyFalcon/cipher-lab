/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import type { CTFChallengeState } from "@/lib/ctf-types";
import { getDb } from "@/server/db";

export function readCTFAccountData(userId: string) {
  const db = getDb();
  const completions = db
    .prepare("SELECT challenge_id, awarded_xp FROM ctf_completions WHERE user_id = ?")
    .all(userId) as { challenge_id: string; awarded_xp: number }[];

  const unlocks = db
    .prepare("SELECT challenge_id, hint_id FROM ctf_hint_purchases WHERE user_id = ?")
    .all(userId) as { challenge_id: string; hint_id: string }[];

  const hints = new Map<string, Set<string>>();
  for (const unlock of unlocks) {
    const ids = hints.get(unlock.challenge_id) ?? new Set<string>();
    ids.add(unlock.hint_id);
    hints.set(unlock.challenge_id, ids);
  }

  return {
    completions: new Map(completions.map((row) => [row.challenge_id, row.awarded_xp])),
    hints,
  };
}

export function getCTFCatalogProgress(userId: string) {
  const db = getDb();
  const account = readCTFAccountData(userId);

  const topics = db.prepare("SELECT * FROM topics ORDER BY sequence_order, id").all() as any[];
  const ctfs = db.prepare("SELECT * FROM ctfs ORDER BY sequence_order, id").all() as any[];
  const universes = db.prepare("SELECT * FROM ctf_universes ORDER BY sequence_order, id").all() as any[];
  const challenges = db.prepare("SELECT * FROM ctf_challenges ORDER BY sequence_order, id").all() as any[];
  const hints = db.prepare("SELECT * FROM ctf_hints ORDER BY sequence_order, id").all() as any[];

  return topics.map(topic => {
    const topicCtfs = ctfs.filter(c => c.topic_id === topic.id).map(ctf => {
      const ctfUniverses = universes.filter(u => u.ctf_id === ctf.id).map(universe => {
        const universeChallenges = challenges.filter(c => c.universe_id === universe.id).map(challenge => {
          const chints = hints.filter(h => h.challenge_id === challenge.id);
          const unlockedHints = account.hints.get(challenge.id) || new Set();
          const completed = account.completions.has(challenge.id);
          const awardedXp = account.completions.get(challenge.id) ?? null;

          const penaltyXp = chints.reduce((sum, h) => sum + (unlockedHints.has(h.id) ? h.penalty : 0), 0);
          
          const state: CTFChallengeState = {
            completed,
            awardedXp,
            basePoints: challenge.points,
            penaltyXp,
            achievableXp: completed ? awardedXp! : Math.max(0, challenge.points - penaltyXp),
            hints: chints.map((hint, index) => ({
              index,
              penalty: hint.penalty,
              unlocked: unlockedHints.has(hint.id),
              text: unlockedHints.has(hint.id) ? hint.text : null,
            }))
          };

          return { ...challenge, state };
        });

        return { ...universe, challenges: universeChallenges };
      });

      const allCtfChallenges = ctfUniverses.flatMap(u => u.challenges);

      return {
        ...ctf,
        suggestedPaths: [], // DB doesn't have suggestedPaths for CTF right now
        universes: ctfUniverses,
        challengeCount: allCtfChallenges.length,
        completedCount: allCtfChallenges.filter(c => c.state.completed).length,
        earnedXp: allCtfChallenges.reduce((sum, c) => sum + (c.state.awardedXp ?? 0), 0),
        achievableXp: allCtfChallenges.reduce((sum, c) => sum + c.state.achievableXp, 0),
        basePoints: allCtfChallenges.reduce((sum, c) => sum + c.points, 0),
        penaltyXp: allCtfChallenges.reduce((sum, c) => sum + c.state.penaltyXp, 0),
      };
    });

    const allTopicChallenges = topicCtfs.flatMap(c => c.universes.flatMap((u: any) => u.challenges));

    return {
      id: topic.id,
      name: topic.name,
      description: topic.description,
      ctfs: topicCtfs,
      challengeCount: allTopicChallenges.length,
      completedCount: allTopicChallenges.filter(c => c.state.completed).length,
      earnedXp: allTopicChallenges.reduce((sum, c) => sum + (c.state.awardedXp ?? 0), 0),
      achievableXp: allTopicChallenges.reduce((sum, c) => sum + c.state.achievableXp, 0),
      penaltyXp: allTopicChallenges.reduce((sum, c) => sum + c.state.penaltyXp, 0),
    };
  });
}

export function getCTFChallenge(challengeId: string) {
  const db = getDb();
  
  const challenge = db.prepare("SELECT * FROM ctf_challenges WHERE id = ?").get(challengeId) as any;
  if (!challenge) return null;
  
  const hints = db.prepare("SELECT * FROM ctf_hints WHERE challenge_id = ? ORDER BY sequence_order, id").all(challengeId) as any[];
  const universe = db.prepare("SELECT * FROM ctf_universes WHERE id = ?").get(challenge.universe_id) as any;
  const ctf = db.prepare("SELECT * FROM ctfs WHERE id = ?").get(universe.ctf_id) as any;
  const topic = db.prepare("SELECT * FROM topics WHERE id = ?").get(ctf.topic_id) as any;

  return {
    challenge: {
      ...challenge,
      hints
    },
    universe,
    ctf,
    category: topic // the rest of the app calls it category
  };
}

export function getCTFChallengeState(userId: string, challengeId: string): CTFChallengeState {
  const account = readCTFAccountData(userId);
  const db = getDb();
  const challenge = db.prepare("SELECT * FROM ctf_challenges WHERE id = ?").get(challengeId) as any;
  const hints = db.prepare("SELECT * FROM ctf_hints WHERE challenge_id = ? ORDER BY sequence_order, id").all(challengeId) as any[];

  const unlockedHints = account.hints.get(challengeId) || new Set();
  const completed = account.completions.has(challengeId);
  const awardedXp = account.completions.get(challengeId) ?? null;

  const penaltyXp = hints.reduce((sum, h) => sum + (unlockedHints.has(h.id) ? h.penalty : 0), 0);

  return {
    completed,
    awardedXp,
    basePoints: challenge.points,
    penaltyXp,
    achievableXp: completed ? awardedXp! : Math.max(0, challenge.points - penaltyXp),
    hints: hints.map((hint, index) => ({
      index,
      penalty: hint.penalty,
      unlocked: unlockedHints.has(hint.id),
      text: unlockedHints.has(hint.id) ? hint.text : null,
    }))
  };
}
