"use server";

import { requireUserId } from "@/server/current-user";
import { getDb } from "@/server/db";
import { revalidatePath } from "next/cache";

export async function resetProgressAction(targetUserId: string) {
  const userId = await requireUserId();
  if (userId !== "admin") throw new Error("Unauthorized");

  const db = getDb();
  
  const reset = db.transaction(() => {
    db.prepare("DELETE FROM reading_progress WHERE user_id = ?").run(targetUserId);
    db.prepare("DELETE FROM lab_completions WHERE user_id = ?").run(targetUserId);
    db.prepare("DELETE FROM homework_submissions WHERE user_id = ?").run(targetUserId);
    db.prepare("DELETE FROM ctf_completions WHERE user_id = ?").run(targetUserId);
    db.prepare("DELETE FROM ctf_hint_purchases WHERE user_id = ?").run(targetUserId);
  });

  reset();
  revalidatePath("/", "layout");
}

export async function deleteRecordAction(table: string, user_id: string, record_id: string) {
  const userId = await requireUserId();
  if (userId !== "admin") throw new Error("Unauthorized");

  const db = getDb();
  
  if (table === "reading_progress") {
    db.prepare("DELETE FROM reading_progress WHERE user_id = ? AND lesson_id = ?").run(user_id, record_id);
  } else if (table === "lab_completions") {
    db.prepare("DELETE FROM lab_completions WHERE user_id = ? AND challenge_id = ?").run(user_id, record_id);
  } else if (table === "homework_submissions") {
    db.prepare("DELETE FROM homework_submissions WHERE id = ? AND user_id = ?").run(record_id, user_id);
  } else if (table === "ctf_completions") {
    db.prepare("DELETE FROM ctf_completions WHERE user_id = ? AND challenge_id = ?").run(user_id, record_id);
  } else if (table === "ctf_hint_purchases") {
    db.prepare("DELETE FROM ctf_hint_purchases WHERE user_id = ? AND hint_id = ?").run(user_id, record_id);
  } else {
    throw new Error("Invalid table");
  }

  revalidatePath("/", "layout");
}
