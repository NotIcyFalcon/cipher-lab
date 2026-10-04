"use server";

import { timingSafeEqual } from "node:crypto";
import { hashLabAnswer } from "@/server/flags";
import { z } from "zod";
import { getLessons } from "@/server/catalog";
import { requireUserId } from "@/server/current-user";
import { getDb } from "@/server/db";
import { refreshProgress } from "@/server/refresh-progress";

const idSchema = z.string().min(1).max(200);

export async function markReadingComplete(lessonId: string) {
  const userId = await requireUserId();
  const id = idSchema.parse(lessonId);
  const lesson = getLessons().find((item) => item.id === id);

  if (!lesson) throw new Error("Unknown chapter.");

  getDb().prepare(`
    INSERT INTO reading_progress(user_id, lesson_id, xp)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, lesson_id) DO NOTHING
  `).run(userId, lesson.id, lesson.xp);

  refreshProgress();
}

export async function completeLab(
  lessonId: string,
  blockId: string,
  submittedFlag: string,
) {
  const userId = await requireUserId();

  const parsed = z.object({
    lessonId: idSchema,
    blockId: idSchema,
    flag: z.string().min(1).max(1024),
  }).safeParse({
    lessonId,
    blockId,
    flag: submittedFlag,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Enter a valid completion code.",
    };
  }

  const {
    lessonId: lessonKey,
    blockId: blockKey,
    flag,
  } = parsed.data;

  const lesson = getLessons().find(
    (item) => item.id === lessonKey,
  );

  const block = lesson?.blocks.find(
    (item) => item.id === blockKey,
  );

  if (!block || block.type !== "lab") {
    return { ok: false, error: "Unknown lab." };
  }

  const challengeId = `${lessonKey}:${blockKey}`;
  let expectedHash = block.completionCodeHash;

  // Transitional support for existing environment-configured labs.
  // Do not parse legacy configuration when a chapter hash exists.
  if (!expectedHash) {
    let decodedFlags: unknown;

    try {
      decodedFlags = JSON.parse(
        process.env.CYBERBOX_LAB_FLAGS_JSON || "{}",
      );
    } catch {
      console.error("Invalid CYBERBOX_LAB_FLAGS_JSON");

      return {
        ok: false,
        error: "Lab completion configuration is invalid.",
      };
    }

    const flags = z.record(
      z.string(),
      z.string(),
    ).safeParse(decodedFlags);

    if (!flags.success) {
      return {
        ok: false,
        error: "Lab completion configuration is invalid.",
      };
    }

    const legacyAnswer = flags.data[challengeId];

    if (!legacyAnswer) {
      return {
        ok: false,
        error: "This lab has no completion code configured.",
      };
    }

    expectedHash = hashLabAnswer(legacyAnswer);
  }

  const submittedHash = hashLabAnswer(flag);

  // The existing content/database contract expects SHA-256 hex.
  const validHash = /^[a-f0-9]{64}$/i;

  if (
    !validHash.test(expectedHash) ||
    !validHash.test(submittedHash)
  ) {
    console.error(
      "Invalid lab completion hash format",
      { lessonKey, blockKey },
    );

    return {
      ok: false,
      error: "Lab completion configuration is invalid.",
    };
  }

  const correct = timingSafeEqual(
    Buffer.from(expectedHash, "hex"),
    Buffer.from(submittedHash, "hex"),
  );

  if (!correct) {
    return { ok: false, error: "Incorrect answer." };
  }

  getDb().prepare(`
    INSERT INTO lab_completions (
      user_id,
      challenge_id,
      xp
    )
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, challenge_id) DO NOTHING
  `).run(userId, challengeId, block.points);

  refreshProgress();

  return { ok: true };
}

export async function importReadingProgress(raw: string) {
  const userId = await requireUserId();

  const ids = z.array(idSchema).max(1000).parse(
    JSON.parse(z.string().max(32_768).parse(raw)),
  );

  const requested = new Set(ids);
  const lessons = getLessons().filter((lesson) => requested.has(lesson.id));
  const db = getDb();

  const insert = db.prepare(`
    INSERT INTO reading_progress(user_id, lesson_id, xp)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, lesson_id) DO NOTHING
  `);

  db.transaction(() => {
    for (const lesson of lessons) {
      insert.run(userId, lesson.id, lesson.xp);
    }
  }).immediate();

  refreshProgress();
}
