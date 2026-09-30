import Link from "next/link";
import { ChevronRight, Terminal } from "lucide-react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { paths, pathHref } from "@/content/paths";
import { lessons } from "@/content/lessons";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PathsPage() {
  const userId = await requireRonakId();
  const progress = getProgress(userId);
  const completedReading = new Set(progress.readingIds);
  const completedLabs = new Set(progress.labIds);

  return (
    <WorkspaceShell current="/paths">
      <section className="hero">
        <div>
          <h1>Learning paths</h1>
          <p>Pick a topic. Start small. Build your skills.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-terminal"><Terminal size={46} /></div>
          <span className="orbit-dot" />
        </div>
      </section>

      {paths.length > 0 ? (
        <ul className="path-grid" aria-label="Available learning paths">
          {paths.map((path) => {
            const pathLessons = path.lessonIds.map(id => lessons.find(l => l.id === id)).filter(Boolean) as typeof lessons;
            
            // Calculate XP for this path
            let totalPathXp = 0;
            let earnedPathXp = 0;

            pathLessons.forEach(lesson => {
              // Reading XP
              totalPathXp += lesson.xp;
              if (completedReading.has(lesson.id)) earnedPathXp += lesson.xp;

              // Lab XP
              lesson.blocks.forEach(block => {
                if (block.type === "lab") {
                  totalPathXp += 50; // We hardcoded 50 XP per lab
                  if (completedLabs.has(`${lesson.id}:${block.id}`)) {
                    earnedPathXp += 50;
                  }
                }
              });
            });

            return (
              <li key={path.id}>
                <Link href={pathHref(path.id)} className="code-card path-card" style={{ display: 'block', height: '100%' }}>
                  <div className="path-title">
                    <h2>{path.title}</h2>
                    <ChevronRight size={18} aria-hidden="true" />
                  </div>

                  <p>
                    {path.lessonIds.length}
                    {" "}{path.lessonIds.length === 1 ? "lesson" : "lessons"}
                  </p>

                  <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--muted)' }}>Path progress</span>
                      <strong className="accent">{earnedPathXp} / {totalPathXp} XP</strong>
                    </div>
                    <progress 
                      value={earnedPathXp} 
                      max={totalPathXp || 1} 
                      style={{ width: '100%', height: '6px', borderRadius: '3px' }} 
                    />
                  </div>

                  <div className="path-tags" style={{ marginTop: 'auto' }}>
                    <span className="pill">{path.difficulty}</span>
                    <span className="pill">{path.type}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>New learning paths will appear here.</p>
      )}
    </WorkspaceShell>
  );
}
