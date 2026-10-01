"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ctfChallenges } from "@/content/ctf-challenges";
import type { CTFSubmissionState } from "@/lib/ctf-types";
import { requireRonakId } from "@/server/current-user";
import { recordCTFCompletion } from "@/server/ctf";

const submissionSchema = z.object({
  challengeId: z
    .string()
    .trim()
    .min(1, "A challenge is required.")
    .max(128, "Invalid challenge.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid challenge."),
  flag: z
    .string()
    .max(512, "Flags must contain at most 512 characters.")
    .trim()
    .min(1, "Enter a flag."),
});

export async function submitCTFFlag(
  _previousState: CTFSubmissionState,
  formData: FormData,
): Promise<CTFSubmissionState> {
  const userId = await requireRonakId();

  if (!(formData instanceof FormData)) {
    return {
      status: "error",
      message: "Invalid submission.",
      awardedXp: 0,
    };
  }

  const parsed = submissionSchema.safeParse({
    challengeId: formData.get("challengeId"),
    flag: formData.get("flag"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Invalid submission.",
      awardedXp: 0,
    };
  }

  const challenge = ctfChallenges.find(
    (candidate) => candidate.id === parsed.data.challengeId,
  );

  if (!challenge) {
    return {
      status: "error",
      message: "Challenge not found.",
      awardedXp: 0,
    };
  }

  const submittedFlag = parsed.data.flag.trim().toLowerCase();
  const expectedFlag = challenge.flag.trim().toLowerCase();

  if (submittedFlag !== expectedFlag) {
    return {
      status: "error",
      message: "Incorrect flag. Try again.",
      awardedXp: 0,
    };
  }

  let completion: ReturnType<typeof recordCTFCompletion>;

  try {
    completion = recordCTFCompletion(userId, challenge.id);
  } catch (error) {
    console.error("Unable to save CTF completion:", error);

    return {
      status: "error",
      message: "Your completion could not be saved. Please try again.",
      awardedXp: 0,
    };
  }

  revalidatePath("/", "layout");

  if (!completion.created) {
    return {
      status: "already-solved",
      message: "Already solved. Your XP has been recorded.",
      awardedXp: 0,
    };
  }

  return {
    status: "success",
    message: `Correct flag! You earned ${completion.awardedXp} XP.`,
    awardedXp: completion.awardedXp,
  };
}
