/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import type { CTFChallengeState } from "@/lib/ctf-types";
import { getDb } from "@/server/db";

export type SuggestedPath = {
  id: string;
  title: string;
  difficulty: string | null;
};

/** Resolve a CTF definition's suggested_paths_json to existing paths. */
function resolveSuggestedPaths(json: string | null): SuggestedPath[] {
  let decoded: unknown;

  try {
    decoded = JSON.parse(json || "[]");
  } catch {
    decoded = [];
  }

  const ids = Array.isArray(decoded)
    ? [...new Set(
        decoded.filter(
          (value): value is string =>
            typeof value === "string" &&
            value.length > 0 &&
            value.length <= 128,
        ),
      )].slice(0, 10)
    : [];

  const statement = getDb().prepare(`
    SELECT id, title, difficulty
    FROM learning_paths
    WHERE id = ?
  `);

  return ids.flatMap((id) => {
    const row = statement.get(id) as SuggestedPath | undefined;
    return row ? [row] : [];
  });
}

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

  const topics = db.prepare("SELECT * FROM topics WHERE type = 'ctf' ORDER BY id").all() as any[];
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

          return {
            ...challenge,
            labId: challenge.lab_id,
            name: challenge.title, // keeping standard interface
            state
          };
        });

        return {
          ...universe,
          challenges: universeChallenges,
          challengeCount: universeChallenges.length,
          completedCount: universeChallenges.filter(c => c.state.completed).length,
          earnedXp: universeChallenges.reduce((sum, c) => sum + (c.state.awardedXp ?? 0), 0),
          achievableXp: universeChallenges.reduce((sum, c) => sum + c.state.achievableXp, 0),
          penaltyXp: universeChallenges.reduce((sum, c) => sum + c.state.penaltyXp, 0),
        };
      });

      return {
        ...ctf,
        suggestedPaths: resolveSuggestedPaths(ctf.suggested_paths_json),
        universes: ctfUniverses,
        challengeCount: ctfUniverses.reduce((sum, u) => sum + u.challengeCount, 0),
        completedCount: ctfUniverses.reduce((sum, u) => sum + u.completedCount, 0),
        earnedXp: ctfUniverses.reduce((sum, u) => sum + u.earnedXp, 0),
        achievableXp: ctfUniverses.reduce((sum, u) => sum + u.achievableXp, 0),
        penaltyXp: ctfUniverses.reduce((sum, u) => sum + u.penaltyXp, 0),
      };
    });

    return {
      id: topic.id,
      name: topic.name,
      description: topic.description,
      ctfs: topicCtfs,
      challengeCount: topicCtfs.reduce((sum, c) => sum + c.challengeCount, 0),
      completedCount: topicCtfs.reduce((sum, c) => sum + c.completedCount, 0),
      earnedXp: topicCtfs.reduce((sum, c) => sum + c.earnedXp, 0),
      achievableXp: topicCtfs.reduce((sum, c) => sum + c.achievableXp, 0),
      penaltyXp: topicCtfs.reduce((sum, c) => sum + c.penaltyXp, 0),
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

  // Recommended paths are authored on the CTF definition.
  const suggestedPaths = resolveSuggestedPaths(ctf.suggested_paths_json);

  return {
    challenge: {
      ...challenge,
      labId: challenge.lab_id,
      hints,
      suggestedPaths
    },
    universe,
    ctf,
    category: topic 
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
