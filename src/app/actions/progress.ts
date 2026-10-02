"use server";

import { createHash, timingSafeEqual } from "node:crypto";
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
  const lessonKey = idSchema.parse(lessonId);
  const blockKey = idSchema.parse(blockId);
  const flag = z.string().max(1024).parse(submittedFlag);

  const lesson = getLessons().find((item) => item.id === lessonKey);
  const block = lesson?.blocks.find((item) => item.id === blockKey);

  if (!block || block.type !== "lab") {
    return { ok: false, error: "Unknown lab." };
  }

  const challengeId = `${lessonKey}:${blockKey}`;

  const flags = z.record(z.string(), z.string()).parse(
    JSON.parse(process.env.CYBERBOX_LAB_FLAGS_JSON || "{}"),
  );

  const expected = flags[challengeId];

  if (!expected) {
    return { ok: false, error: "This lab has no completion code configured." };
  }

  const hash = (value: string) =>
    createHash("sha256").update(value.trim().toLowerCase()).digest();

  if (!timingSafeEqual(hash(flag), hash(expected))) {
    return { ok: false, error: "Incorrect answer." };
  }

  getDb().prepare(`
    INSERT INTO lab_completions(user_id, challenge_id, xp)
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
