import Link from "next/link";
import { ChevronRight } from "lucide-react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { paths, pathHref } from "@/content/paths";

export default function PathsPage() {
  return (
    <WorkspaceShell current="/paths">
      <section className="hero">
        <div>
          <h1>Learning paths</h1>
          <p>Pick a topic. Start small. Build your skills.</p>
        </div>
      </section>

      {paths.length > 0 ? (
        <ul className="path-grid" aria-label="Available learning paths">
          {paths.map((path) => (
            <li key={path.id}>
              <Link href={pathHref(path.id)} className="code-card path-card">
                <div className="path-title">
                  <h2>{path.title}</h2>
                  <ChevronRight size={18} aria-hidden="true" />
                </div>

                <p>
                  {path.lessonIds.length}
                  {" "}{path.lessonIds.length === 1 ? "lesson" : "lessons"}
                </p>

                <div className="path-tags">
                  <span className="pill">{path.difficulty}</span>
                  <span className="pill">{path.type}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>New learning paths will appear here.</p>
      )}
    </WorkspaceShell>
  );
}
