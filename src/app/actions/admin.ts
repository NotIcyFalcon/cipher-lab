"use server";

import { requireUserId } from "@/server/current-user";
import { getDb } from "@/server/db";
import { revalidatePath } from "next/cache";
import { refreshProgress } from "@/server/refresh-progress";

export async function requireAdmin() {
  const userId = await requireUserId();
  if (userId !== "admin") {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function resetAllProgress(targetUserId: string) {
  await requireAdmin();

  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM reading_progress WHERE user_id = ?").run(targetUserId);
    db.prepare("DELETE FROM lab_completions WHERE user_id = ?").run(targetUserId);
    db.prepare("DELETE FROM homework_submissions WHERE user_id = ?").run(targetUserId);
    db.prepare("DELETE FROM ctf_completions WHERE user_id = ?").run(targetUserId);
    db.prepare("DELETE FROM ctf_hint_purchases WHERE user_id = ?").run(targetUserId);
  })();

  refreshProgress();
  revalidatePath("/");
}

export async function deleteProgressEntry(type: string, id: string, targetUserId: string) {
  await requireAdmin();
  const db = getDb();

  if (type === "reading") {
    db.prepare("DELETE FROM reading_progress WHERE user_id = ? AND lesson_id = ?").run(targetUserId, id);
  } else if (type === "lab") {
    const [lessonId, blockId] = id.split(":");
    db.prepare("DELETE FROM lab_completions WHERE user_id = ? AND lesson_id = ? AND block_id = ?").run(targetUserId, lessonId, blockId);
  } else if (type === "homework") {
    db.prepare("DELETE FROM homework_submissions WHERE user_id = ? AND homework_id = ?").run(targetUserId, id);
  } else if (type === "ctf") {
    db.prepare("DELETE FROM ctf_completions WHERE user_id = ? AND challenge_id = ?").run(targetUserId, id);
  } else if (type === "hint") {
    db.prepare("DELETE FROM ctf_hint_purchases WHERE user_id = ? AND hint_id = ?").run(targetUserId, id);
  } else {
    throw new Error("Unknown progress type");
  }

  refreshProgress();
  revalidatePath("/");
}
