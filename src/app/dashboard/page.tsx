import Link from "next/link";
import { ArrowUpRight, Award, Terminal } from "lucide-react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { lessons } from "@/content/lessons";
import { paths, pathHref } from "@/content/paths";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await requireRonakId();
  const progress = getProgress(userId);

  const completed = new Set(progress.readingIds);
  const xp = progress.totalXp;
  const readCount = progress.readingIds.length;

  const certificates = paths.filter(
    (path) =>
      path.lessonIds.length > 0 &&
      path.lessonIds.every((id) => completed.has(id)),
  );

  const remaining = paths.filter((path) => !certificates.includes(path));
  const next =
    remaining.find((path) =>
      path.lessonIds.some((id) => completed.has(id)),
    ) ?? remaining[0];

  const started = next?.lessonIds.some((id) => completed.has(id));

  return (
    <WorkspaceShell current="/dashboard">
      <section className="hero">
        <div>
          <h1>Welcome back, Ronak.</h1>
          <p>A box made to learn Cyber Sec.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-terminal"><Terminal size={46} /></div>
          <span className="orbit-dot" />
        </div>
      </section>

      <dl className="overview-stats" aria-label="Your progress">
        <div>
          <dt>Overall XP</dt>
          <dd className="accent">{xp.toLocaleString("en-US")}</dd>
        </div>
        <div>
          <dt>Paths completed</dt>
          <dd>{certificates.length}</dd>
        </div>
      </dl>

      <p className="overview-info">
        {readCount} of {lessons.length} lessons read.
        {" "}Progress is saved to your account.
      </p>

      <section className="completion-card next-step" aria-labelledby="next-title">
        <div>
          <span className="eyebrow">YOUR NEXT STEP</span>
          <h2 id="next-title">{next?.title ?? "Explore your learning paths"}</h2>
          <p>One lesson at a time, at your own pace.</p>
        </div>

        <Link
          href={next ? pathHref(next.id) : "/paths"}
          className="primary-button"
        >
          {next ? (started ? "Continue path" : "Start path") : "Browse paths"}
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </section>

      <section className="overview-section" aria-labelledby="certificates-title">
        <h2 id="certificates-title">Certificates</h2>

        {certificates.length > 0 ? (
          <ul className="certificate-list">
            {certificates.slice(0, 3).map((path) => (
              <li key={path.id}>
                <Link
                  href={pathHref(path.id)}
                  className="code-card certificate-row"
                >
                  <Award size={23} aria-hidden="true" />
                  <span>
                    <strong>{path.title}</strong>
                    <small>Reading completed • Ronak</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="overview-info">
            Complete the reading in a path to earn your first certificate.
          </p>
        )}
      </section>
    </WorkspaceShell>
  );
}
