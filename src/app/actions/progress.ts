"use server";

import { z } from "zod";
import { lessons } from "@/content/lessons";
import { requireRonakId } from "@/server/current-user";
import { getDb } from "@/server/db";
import { refreshProgress } from "@/server/refresh-progress";

export async function markReadingComplete(lessonId: string) {
  const userId = await requireRonakId();
  const id = z.string().min(1).max(200).parse(lessonId);

  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) throw new Error("Unknown lesson");

  getDb().prepare(`
    INSERT INTO reading_progress (user_id, lesson_id, xp)
    VALUES (?, ?, ?)
    ON CONFLICT (user_id, lesson_id) DO NOTHING
  `).run(userId, lesson.id, lesson.xp);

  refreshProgress();
}

export async function completeLab(
  lessonId: string,
  blockId: string,
  submittedFlag: string,
) {
  const userId = await requireRonakId();

  const lessonKey = z.string().min(1).max(200).parse(lessonId);
  const blockKey = z.string().min(1).max(200).parse(blockId);
  const flag = z.string().max(1024).parse(submittedFlag);

  const lesson = lessons.find((item) => item.id === lessonKey);
  const block = lesson?.blocks.find((item) => item.id === blockKey);

  if (!block || block.type !== "lab") {
    return { ok: false, error: "Unknown lab." };
  }

  const challengeId = `${lessonKey}:${blockKey}`;

  const flags = z.record(z.string(), z.string()).parse(
    JSON.parse(process.env.CYBERBOX_LAB_FLAGS_JSON || "{}"),
  );

  const expectedFlag = flags[challengeId];

  if (!expectedFlag) {
    return { ok: false, error: "This lab is not configured for submission." };
  }

  if (flag.trim().toLowerCase() !== expectedFlag.trim().toLowerCase()) {
    return { ok: false, error: "Incorrect answer." };
  }

  getDb().prepare(`
    INSERT INTO lab_completions (user_id, challenge_id, xp)
    VALUES (?, ?, ?)
    ON CONFLICT (user_id, challenge_id) DO NOTHING
  `).run(userId, challengeId, 50);

  refreshProgress();

  return { ok: true };
}

export async function importReadingProgress(raw: string) {
  const userId = await requireRonakId();
  const input = z.string().max(32_768).parse(raw);
  const ids = z.array(z.string().max(200)).max(1000).parse(JSON.parse(input));

  const requested = new Set(ids);
  const knownLessons = lessons.filter((lesson) => requested.has(lesson.id));
  const db = getDb();

  const insert = db.prepare(`
    INSERT INTO reading_progress (user_id, lesson_id, xp)
    VALUES (?, ?, ?)
    ON CONFLICT (user_id, lesson_id) DO NOTHING
  `);

  db.transaction(() => {
    for (const lesson of knownLessons) {
      insert.run(userId, lesson.id, lesson.xp);
    }
  })();

  refreshProgress();
}
