import { requireUserId } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getLessons } from "@/server/catalog";
import WorkspaceShell from "@/components/WorkspaceShell";
import { resetProgressAction, deleteRecordAction } from "./actions";
import { ShieldAlert, Trash2 } from "lucide-react";

type RecordItem = {
  key: string;
  label: string;
  detail: string;
  remove: () => Promise<void>;
};

function RecordList({ title, items }: { title: string; items: RecordItem[] }) {
  return (
    <section className="b5-profile-panel">
      <h3>{title} ({items.length})</h3>
      <ul style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.map((item) => (
          <li key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "10px", background: "var(--color-bg-elevated)", borderRadius: "6px" }}>
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
              <strong>{item.label}</strong>
              {item.detail && (
                <span style={{ display: "block", color: "var(--color-text-secondary)", fontSize: "13px" }}>
                  {item.detail}
                </span>
              )}
            </span>
            <form action={item.remove}>
              <button aria-label={`Delete ${item.label}`} style={{ color: "var(--color-danger)", cursor: "pointer", background: "none", border: "none" }}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </form>
          </li>
        ))}
        {items.length === 0 && <span style={{ color: "var(--color-text-tertiary)" }}>No records found.</span>}
      </ul>
    </section>
  );
}

export default async function AdminSettingsPage() {
  const userId = await requireUserId();

  if (userId !== "admin") {
    return (
      <WorkspaceShell current="/admin/settings" userId={userId}>
        <div className="dashboard-empty">
          <ShieldAlert size={40} />
          <h2>Access Denied</h2>
          <p>You must be logged in as an administrator to view this page.</p>
        </div>
      </WorkspaceShell>
    );
  }

  const db = getDb();

  // Titles are joined in for readability; records whose content was deleted
  // still appear (with their raw ID) so they can be cleaned up.
  const reading = db.prepare(`
    SELECT r.lesson_id AS id, c.title, p.title AS pathTitle, r.xp
    FROM reading_progress r
    LEFT JOIN chapters c ON c.id = r.lesson_id
    LEFT JOIN learning_paths p ON p.id = c.path_id
    WHERE r.user_id = 'ronak'
    ORDER BY r.completed_at DESC
  `).all() as { id: string; title: string | null; pathTitle: string | null; xp: number }[];

  const labs = db.prepare(`
    SELECT challenge_id AS id, xp
    FROM lab_completions
    WHERE user_id = 'ronak'
    ORDER BY completed_at DESC
  `).all() as { id: string; xp: number }[];

  const homework = db.prepare(`
    SELECT s.id, s.homework_id AS homeworkId, h.title, s.status, s.awarded_xp AS xp
    FROM homework_submissions s
    LEFT JOIN homework h ON h.id = s.homework_id
    WHERE s.user_id = 'ronak'
    ORDER BY s.id DESC
  `).all() as { id: number; homeworkId: string; title: string | null; status: string; xp: number }[];

  const ctf = db.prepare(`
    SELECT c.challenge_id AS id, ch.title, c.awarded_xp AS xp
    FROM ctf_completions c
    LEFT JOIN ctf_challenges ch ON ch.id = c.challenge_id
    WHERE c.user_id = 'ronak'
    ORDER BY c.completed_at DESC
  `).all() as { id: string; title: string | null; xp: number }[];

  const hints = db.prepare(`
    SELECT p.hint_id AS id, ch.title AS challengeTitle, h.sequence_order AS position, p.penalty_xp AS penalty
    FROM ctf_hint_purchases p
    LEFT JOIN ctf_hints h ON h.id = p.hint_id
    LEFT JOIN ctf_challenges ch ON ch.id = p.challenge_id
    WHERE p.user_id = 'ronak'
    ORDER BY p.unlocked_at DESC
  `).all() as { id: string; challengeTitle: string | null; position: number | null; penalty: number }[];

  // Lab completions are keyed "chapterId:blockId" inside chapter JSON.
  const labTitles = new Map<string, string>();
  for (const lesson of getLessons()) {
    for (const block of lesson.blocks) {
      if (block.type === "lab") {
        labTitles.set(`${lesson.id}:${block.id}`, `${block.title} — ${lesson.title}`);
      }
    }
  }

  return (
    <WorkspaceShell current="/admin/settings" userId={userId}>
      <div className="b5-profile-page" style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
        <header className="b5-profile-hero" style={{ marginBottom: "40px" }}>
          <div className="b5-profile-intro">
            <span className="dashboard-kicker">SYSTEM ADMINISTRATION</span>
            <h1>Admin Settings</h1>
            <p style={{ marginTop: "10px", color: "var(--color-text-secondary)" }}>
              Manage progress, wipe data, and oversee the platform.
            </p>
          </div>
        </header>

        <section className="b5-profile-panel" style={{ marginBottom: "30px", border: "1px solid var(--color-danger-border)", background: "var(--color-danger-bg)" }}>
          <div className="b5-profile-panel-heading">
            <div>
              <span className="dashboard-kicker" style={{ color: "var(--color-danger)" }}>DANGER ZONE</span>
              <h2>Global Progress Reset</h2>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", marginTop: "20px" }}>
            <form action={resetProgressAction.bind(null, "admin")}>
              <button className="primary-button" style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", color: "var(--text)" }}>
                Reset Admin XP to 0
              </button>
            </form>
            <form action={resetProgressAction.bind(null, "ronak")}>
              <button className="primary-button" style={{ background: "var(--color-danger)", color: "#1b0b0e" }}>
                Reset Ronak&apos;s XP to 0
              </button>
            </form>
          </div>
        </section>

        <div style={{ display: "grid", gap: "30px" }}>
          <RecordList
            title="Homework Submissions"
            items={homework.map((item) => ({
              key: String(item.id),
              label: item.title || item.homeworkId,
              detail: `Submission #${item.id} · ${item.status} · ${item.xp} XP`,
              remove: deleteRecordAction.bind(null, "homework_submissions", "ronak", String(item.id)),
            }))}
          />

          <RecordList
            title="Lab Completions"
            items={labs.map((item) => ({
              key: item.id,
              label: labTitles.get(item.id) ?? item.id,
              detail: `${item.xp} XP${labTitles.has(item.id) ? "" : " · lab no longer exists"}`,
              remove: deleteRecordAction.bind(null, "lab_completions", "ronak", item.id),
            }))}
          />

          <RecordList
            title="CTF Captures"
            items={ctf.map((item) => ({
              key: item.id,
              label: item.title || item.id,
              detail: `${item.xp} XP`,
              remove: deleteRecordAction.bind(null, "ctf_completions", "ronak", item.id),
            }))}
          />

          <RecordList
            title="Hint Unlocks"
            items={hints.map((item) => ({
              key: item.id,
              label: item.challengeTitle
                ? `${item.challengeTitle} — hint ${(item.position ?? 0) + 1}`
                : item.id,
              detail: `−${item.penalty} XP`,
              remove: deleteRecordAction.bind(null, "ctf_hint_purchases", "ronak", item.id),
            }))}
          />

          <RecordList
            title="Reading Progress"
            items={reading.map((item) => ({
              key: item.id,
              label: item.title || item.id,
              detail: [item.pathTitle, `${item.xp} XP`].filter(Boolean).join(" · "),
              remove: deleteRecordAction.bind(null, "reading_progress", "ronak", item.id),
            }))}
          />
        </div>
      </div>
    </WorkspaceShell>
  );
}
