"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { findCTFChallenge } from "@/content/ctf-catalog";
import type { CTFActionReply } from "@/lib/ctf-types";
import { getCTFChallengeState } from "@/server/ctf";
import { requireRonakId } from "@/server/current-user";
import { getDb } from "@/server/db";

const challengeIdSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const hintSchema = z.object({
  challengeId: challengeIdSchema,
  hintIndex: z.number().int().min(0).max(1000),
});

const flagSchema = z.object({
  challengeId: challengeIdSchema,
  flag: z.string().trim().min(1).max(512),
});

function flagsMatch(submitted: string, expected: string): boolean {
  const submittedHash = createHash("sha256").update(submitted).digest();
  const expectedHash = createHash("sha256").update(expected).digest();

  return timingSafeEqual(submittedHash, expectedHash);
}

function refreshCTFPages(categoryId: string, challengeId: string) {
  revalidatePath("/ctf", "layout");
  revalidatePath(`/ctf/${categoryId}`);
  revalidatePath(`/ctf/challenge/${challengeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/paths");
}

export async function buyCTFHint(
  challengeId: string,
  hintIndex: number,
): Promise<CTFActionReply> {
  const userId = await requireRonakId();
  const parsed = hintSchema.safeParse({ challengeId, hintIndex });

  if (!parsed.success) {
    return { ok: false, error: "Select a valid challenge and hint." };
  }

  const entry = findCTFChallenge(parsed.data.challengeId);

  if (!entry) {
    return { ok: false, error: "Challenge not found." };
  }

  const { challenge, category } = entry;
  const index = parsed.data.hintIndex;

  if (!challenge.hints[index]) {
    return { ok: false, error: "Hint not found." };
  }

  const db = getDb();

  let reply: CTFActionReply;

  try {
    reply = db
      .transaction((): CTFActionReply => {
        const state = getCTFChallengeState(userId, challenge);

        if (state.hints[index].unlocked) {
          return {
            ok: true,
            outcome: "already-unlocked",
            state,
          };
        }

        if (state.completed) {
          return {
            ok: false,
            error:
              "This challenge is complete. Further hint purchases are disabled to preserve your recorded score.",
            state,
          };
        }

        db.prepare(`
          INSERT INTO ctf_hint_unlocks (
            user_id,
            challenge_id,
            hint_index
          )
          VALUES (?, ?, ?)
        `).run(userId, challenge.id, index);

        return {
          ok: true,
          outcome: "unlocked",
          state: getCTFChallengeState(userId, challenge),
        };
      })
      .immediate();
  } catch {
    // Do not log submitted flags or server-only challenge definitions.
    return {
      ok: false,
      error: "The hint could not be unlocked. Please try again.",
    };
  }

  if (reply.ok) {
    refreshCTFPages(category.id, challenge.id);
  }

  return reply;
}

export async function submitCTFFlag(
  formData: FormData,
): Promise<CTFActionReply> {
  const userId = await requireRonakId();

  const parsed = flagSchema.safeParse({
    challengeId: formData.get("challengeId"),
    flag: formData.get("flag"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Enter a flag between 1 and 512 characters.",
    };
  }

  const entry = findCTFChallenge(parsed.data.challengeId);

  if (!entry) {
    return { ok: false, error: "Challenge not found." };
  }

  const { challenge, category } = entry;

  if (!flagsMatch(parsed.data.flag, challenge.flag)) {
    return {
      ok: false,
      error: "That flag is not correct. Recheck the evidence and try again.",
    };
  }

  const db = getDb();
  let reply: CTFActionReply;

  try {
    reply = db
      .transaction((): CTFActionReply => {
        const state = getCTFChallengeState(userId, challenge);

        if (state.completed) {
          return {
            ok: true,
            outcome: "already-complete",
            state,
          };
        }

        db.prepare(`
          INSERT INTO ctf_completions (
            user_id,
            challenge_id,
            awarded_xp
          )
          VALUES (?, ?, ?)
        `).run(userId, challenge.id, state.achievableXp);

        return {
          ok: true,
          outcome: "correct",
          state: getCTFChallengeState(userId, challenge),
        };
      })
      .immediate();
  } catch {
    return {
      ok: false,
      error: "Your result could not be saved. Please submit again.",
    };
  }

  refreshCTFPages(category.id, challenge.id);
  return reply;
}
