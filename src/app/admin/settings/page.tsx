import { requireUserId } from "@/server/current-user";
import { getDb } from "@/server/db";
import WorkspaceShell from "@/components/WorkspaceShell";
import { resetProgressAction, deleteRecordAction } from "./actions";
import { ShieldAlert, Trash2 } from "lucide-react";

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
  
  type ReadingRow = { user_id: string; lesson_id: string; created_at: number };
  type HomeworkRow = { id: string; homework_id: string; status: string; created_at: number };
  type CtfRow = { user_id: string; challenge_id: string; completed_at: number };
  type HintRow = { user_id: string; hint_id: string; unlocked_at: number };

  const reading = db.prepare("SELECT user_id, lesson_id, created_at FROM reading_progress WHERE user_id = 'ronak'").all() as ReadingRow[];
  const homework = db.prepare("SELECT id, homework_id, status, created_at FROM homework_submissions WHERE user_id = 'ronak'").all() as HomeworkRow[];
  const ctf = db.prepare("SELECT user_id, challenge_id, completed_at FROM ctf_completions WHERE user_id = 'ronak'").all() as CtfRow[];
  const hints = db.prepare("SELECT user_id, hint_id, unlocked_at FROM ctf_hint_unlocks WHERE user_id = 'ronak'").all() as HintRow[];

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

        <section className="b5-profile-panel" style={{ marginBottom: "30px", border: "1px solid var(--color-danger-border)", background: "var(--color-danger-bg, rgba(255, 0, 0, 0.05))" }}>
          <div className="b5-profile-panel-heading">
            <div>
              <span className="dashboard-kicker" style={{ color: "var(--color-danger)" }}>DANGER ZONE</span>
              <h2>Global Progress Reset</h2>
            </div>
          </div>
          <div style={{ display: "flex", gap: "15px", marginTop: "20px" }}>
            <form action={resetProgressAction.bind(null, "admin")}>
              <button className="primary-button" style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)" }}>
                Reset Admin XP to 0
              </button>
            </form>
            <form action={resetProgressAction.bind(null, "ronak")}>
              <button className="primary-button" style={{ background: "var(--color-danger)", color: "white" }}>
                Reset Ronak&apos;s XP to 0
              </button>
            </form>
          </div>
        </section>

        <div style={{ display: "grid", gap: "30px" }}>
          
          <section className="b5-profile-panel">
            <h3>Homework Submissions ({homework.length})</h3>
            <ul style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {homework.map(h => (
                <li key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "var(--color-bg-elevated)", borderRadius: "6px" }}>
                  <span>{h.homework_id} ({h.status})</span>
                  <form action={deleteRecordAction.bind(null, "homework_submissions", "ronak", h.id)}>
                    <button style={{ color: "var(--color-danger)", cursor: "pointer", background: "none", border: "none" }}><Trash2 size={16} /></button>
                  </form>
                </li>
              ))}
              {homework.length === 0 && <span style={{ color: "var(--color-text-tertiary)" }}>No records found.</span>}
            </ul>
          </section>
          
          <section className="b5-profile-panel">
            <h3>CTF Captures ({ctf.length})</h3>
            <ul style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {ctf.map(c => (
                <li key={c.challenge_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "var(--color-bg-elevated)", borderRadius: "6px" }}>
                  <span>{c.challenge_id}</span>
                  <form action={deleteRecordAction.bind(null, "ctf_completions", "ronak", c.challenge_id)}>
                    <button style={{ color: "var(--color-danger)", cursor: "pointer", background: "none", border: "none" }}><Trash2 size={16} /></button>
                  </form>
                </li>
              ))}
              {ctf.length === 0 && <span style={{ color: "var(--color-text-tertiary)" }}>No records found.</span>}
            </ul>
          </section>
          
          <section className="b5-profile-panel">
            <h3>Hint Unlocks ({hints.length})</h3>
            <ul style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {hints.map(h => (
                <li key={h.hint_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "var(--color-bg-elevated)", borderRadius: "6px" }}>
                  <span>{h.hint_id}</span>
                  <form action={deleteRecordAction.bind(null, "ctf_hint_unlocks", "ronak", h.hint_id)}>
                    <button style={{ color: "var(--color-danger)", cursor: "pointer", background: "none", border: "none" }}><Trash2 size={16} /></button>
                  </form>
                </li>
              ))}
              {hints.length === 0 && <span style={{ color: "var(--color-text-tertiary)" }}>No records found.</span>}
            </ul>
          </section>

          <section className="b5-profile-panel">
            <h3>Reading Progress ({reading.length})</h3>
            <ul style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {reading.map(r => (
                <li key={r.lesson_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "var(--color-bg-elevated)", borderRadius: "6px" }}>
                  <span>{r.lesson_id}</span>
                  <form action={deleteRecordAction.bind(null, "reading_progress", "ronak", r.lesson_id)}>
                    <button style={{ color: "var(--color-danger)", cursor: "pointer", background: "none", border: "none" }}><Trash2 size={16} /></button>
                  </form>
                </li>
              ))}
              {reading.length === 0 && <span style={{ color: "var(--color-text-tertiary)" }}>No records found.</span>}
            </ul>
          </section>

        </div>
      </div>
    </WorkspaceShell>
  );
}
