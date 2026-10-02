import "server-only";
import { requireUserId } from "@/server/current-user";
import { getDb } from "@/server/db";
import { revalidatePath } from "next/cache";

function requireAdmin() {
  // We can't await inside a regular function easily if we want to return directly, 
  // so this will be called inside the async actions.
}

export async function resetUserProgress(targetUserId: string) {
  const userId = await requireUserId();
  if (userId !== "admin") throw new Error("Unauthorized");

  const db = getDb();
  
  const reset = db.transaction(() => {
    db.prepare("DELETE FROM reading_progress WHERE user_id = ?").run(targetUserId);
    db.prepare("DELETE FROM lab_completions WHERE user_id = ?").run(targetUserId);
    db.prepare("DELETE FROM homework_submissions WHERE user_id = ?").run(targetUserId);
    db.prepare("DELETE FROM ctf_completions WHERE user_id = ?").run(targetUserId);
    db.prepare("DELETE FROM ctf_hint_unlocks WHERE user_id = ?").run(targetUserId);
  });

  reset();
  revalidatePath("/", "layout");
}

export async function deleteSpecificRecord(table: string, id: string) {
  const userId = await requireUserId();
  if (userId !== "admin") throw new Error("Unauthorized");

  const db = getDb();
  
  // Only allow specific tables
  const allowedTables = [
    "reading_progress",
    "lab_completions",
    "homework_submissions",
    "ctf_completions",
    "ctf_hint_unlocks"
  ];
  
  if (!allowedTables.includes(table)) throw new Error("Invalid table");

  // Since it's a composite key or just simple id, we need to handle it.
  // Actually, wait, reading_progress uses (user_id, lesson_id).
  // lab_completions uses (user_id, challenge_id).
  // homework_submissions uses id as primary key!
  // ctf_completions uses (user_id, challenge_id).
  // ctf_hint_unlocks uses (user_id, hint_id).
  // We should pass the specific column name and value.
}
