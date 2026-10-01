import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Check,
  Clock3,
  FileCode2,
  Flag,
  RotateCcw,
  Terminal,
  Trophy,
} from "lucide-react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { lessons } from "@/content/lessons";
import {
  paths,
  pathHref,
  pathRevisionHref,
} from "@/content/paths";
import {
  formatLessonDuration,
  getPathProgress,
} from "@/lib/path-progress";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const number = (value: number) => value.toLocaleString("en-US");

export default async function DashboardPage() {
  const userId = await requireRonakId();
  const progress = getProgress(userId);

  const pathSummaries = paths.map((path) => ({
    path,
    summary: getPathProgress(path, progress),
  }));

  const certificates = pathSummaries.filter(
    ({ summary }) => summary.readingComplete,
  );

  const unfinished = pathSummaries.filter(
    ({ summary }) => !summary.readingComplete,
  );

  const next =
    unfinished.find(({ summary }) => summary.started) ?? unfinished[0];

  const knownReading = new Set(progress.readingIds);
  const readCount = lessons.filter((lesson) =>
    knownReading.has(lesson.id),
  ).length;

  const completedHomework = new Set(
    lessons.flatMap((lesson) =>
      lesson.blocks.flatMap((block) =>
        block.type === "homework" &&
        (progress.homeworkBest[block.homeworkId] ?? 0) >= block.totalPoints
          ? [block.homeworkId]
          : [],
      ),
    ),
  ).size;

  const xpCategories = [
    { label: "Reading", value: progress.readingXp, className: "reading" },
    { label: "Labs", value: progress.labsXp, className: "labs" },
    { label: "Homework", value: progress.homeworkXp, className: "homework" },
    { label: "CTF", value: progress.ctfXp, className: "ctf" },
  ];

  return (
    <WorkspaceShell current="/dashboard">
      <div className="dashboard-page">
        <section className="dashboard-heading" aria-labelledby="dashboard-title">
          <div>
            <span className="dashboard-kicker">YOUR LEARNING WORKSPACE</span>
            <h1 id="dashboard-title">Welcome back, Ronak.</h1>
            <p>
              Build your foundations. Practice with purpose. Make your next
              discovery.
            </p>
          </div>
          <span className="dashboard-account-note">
            <span aria-hidden="true" />
            Account-backed progress
          </span>
        </section>

        <dl className="dashboard-stats" aria-label="Learning overview">
          <div className="dashboard-stat">
            <dt>
              <Trophy size={17} aria-hidden="true" />
              Total earned XP
            </dt>
            <dd className="accent">{number(progress.totalXp)}</dd>
            <p>Across learning, labs, homework, and CTF</p>
          </div>

          <div className="dashboard-stat">
            <dt>
              <BookOpen size={17} aria-hidden="true" />
              Lessons read
            </dt>
            <dd>
              {readCount} <span> / {lessons.length}</span>
            </dd>
            <p>Small steps toward stronger foundations</p>
          </div>

          <div className="dashboard-stat">
            <dt>
              <Award size={17} aria-hidden="true" />
              Certificates
            </dt>
            <dd>{certificates.length}</dd>
            <p>Learning paths with all reading completed</p>
          </div>

          <div className="dashboard-stat">
            <dt>
              <Flag size={17} aria-hidden="true" />
              CTF challenges solved
            </dt>
            <dd>{progress.ctfIds.length}</dd>
            <p>{number(progress.ctfXp)} XP earned through investigation</p>
          </div>
        </dl>

        <div className="dashboard-feature-grid">
          <section
            className="dashboard-next"
            aria-labelledby="next-step-title"
          >
            <div className="dashboard-next-icon" aria-hidden="true">
              <Terminal size={24} />
            </div>

            <div className="dashboard-next-content">
              <span className="dashboard-kicker">
                {next ? "YOUR NEXT STEP" : "KEEP YOUR SKILLS SHARP"}
              </span>
              <h2 id="next-step-title">
                {next?.path.title ?? "Foundations complete. Stay curious."}
              </h2>
              <p>
                {next
                  ? `${next.summary.readingCount} of ${next.summary.lessonCount} lessons read. Continue at your own pace—your progress stays with you.`
                  : "Revisit a completed path, improve your homework score, or put your skills to work in a CTF."}
              </p>

              <Link
                href={next ? pathHref(next.path.id) : "/ctf"}
                className="primary-button dashboard-action"
              >
                {next
                  ? next.summary.started
                    ? "Continue learning"
                    : "Start learning"
                  : "Explore CTF challenges"}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>

            {next && (
              <div className="dashboard-next-meta">
                <span>{next.path.difficulty}</span>
                <span>
                  <Clock3 size={14} aria-hidden="true" />
                  {formatLessonDuration(next.summary.minutes)} of lessons
                </span>
              </div>
            )}
          </section>

          <section className="dashboard-panel" aria-labelledby="xp-title">
            <div className="dashboard-section-heading compact">
              <div>
                <span className="dashboard-kicker">YOUR PROGRESS MIX</span>
                <h2 id="xp-title">Every skill counts.</h2>
              </div>
              <Trophy size={20} aria-hidden="true" />
            </div>

            <dl className="dashboard-xp-list">
              {xpCategories.map((category) => (
                <div key={category.label}>
                  <dt>
                    <span
                      className={`dashboard-xp-dot ${category.className}`}
                      aria-hidden="true"
                    />
                    {category.label}
                  </dt>
                  <dd>{number(category.value)} XP</dd>
                </div>
              ))}
            </dl>

            <p className="dashboard-panel-note">
              Homework contributes your best score, not repeated submissions.
            </p>
          </section>
        </div>

        <section
          className="dashboard-section"
          aria-labelledby="dashboard-paths-title"
        >
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-kicker">BUILD YOUR FOUNDATION</span>
              <h2 id="dashboard-paths-title">Your learning paths</h2>
              <p>Guided lessons, hands-on practice, and a clear sense of progress.</p>
            </div>
            <Link href="/paths" className="dashboard-text-link">
              View all paths
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {pathSummaries.length > 0 ? (
            <ul className="dashboard-path-grid">
              {pathSummaries.map(({ path, summary }) => (
                <li key={path.id}>
                  <article className="dashboard-path-card">
                    <div className="dashboard-path-top">
                      <span className="dashboard-path-icon" aria-hidden="true">
                        <Terminal size={23} />
                      </span>
                      <span
                        className={`dashboard-state${
                          summary.readingComplete ? " is-complete" : ""
                        }`}
                      >
                        {summary.readingComplete && (
                          <Check size={13} aria-hidden="true" />
                        )}
                        {summary.readingComplete
                          ? "Reading complete"
                          : summary.started
                            ? "In progress"
                            : "Ready to start"}
                      </span>
                    </div>

                    <div className="dashboard-path-body">
                      <span className="dashboard-kicker">{path.type} PATH</span>
                      <h3>{path.title}</h3>
                      <p>
                        {summary.lessonCount} guided{" "}
                        {summary.lessonCount === 1 ? "lesson" : "lessons"}
                        {" · "}
                        {summary.labCount}{" "}
                        {summary.labCount === 1 ? "lab" : "labs"}
                        {" · "}
                        {summary.homeworkCount} homework{" "}
                        {summary.homeworkCount === 1 ? "question" : "questions"}
                      </p>

                      <div className="dashboard-path-tags">
                        <span>{path.difficulty}</span>
                        <span>
                          <Clock3 size={13} aria-hidden="true" />
                          ~{formatLessonDuration(summary.minutes)} of lessons
                        </span>
                      </div>
                    </div>

                    <div className="dashboard-path-progress">
                      <div>
                        <span>Points earned</span>
                        <strong>
                          {number(summary.earned)}{" "}
                          <span> / {number(summary.available)} XP</span>
                        </strong>
                      </div>
                      <progress
                        value={summary.earned}
                        max={summary.available || 1}
                        aria-label={`${path.title}: ${summary.earned} of ${summary.available} XP earned`}
                      />
                      <p>
                        {summary.readingAvailable} reading {" + "}
                        {summary.labsAvailable} lab {" + "}
                        {summary.homeworkAvailable} homework XP
                      </p>
                    </div>

                    <div className="dashboard-path-footer">
                      <span>{summary.percentage}% of available XP</span>
                      <Link
                        href={pathHref(path.id)}
                        className="dashboard-text-link"
                        aria-label={`${
                          summary.readingComplete
                            ? "Open"
                            : summary.started
                              ? "Continue"
                              : "Start"
                        } ${path.title}`}
                      >
                        {summary.readingComplete
                          ? "Open path"
                          : summary.started
                            ? "Continue"
                            : "Start path"}
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <div className="dashboard-empty">
              <BookOpen size={26} aria-hidden="true" />
              <h3>Your next chapter is on its way.</h3>
              <p>New learning paths will appear here as content is added.</p>
            </div>
          )}

          <p className="dashboard-footnote">
            Time estimates cover lesson content. Allow extra time for labs and
            homework.
          </p>
        </section>

        <div className="dashboard-bottom-grid">
          <section
            className="dashboard-panel dashboard-certificates"
            aria-labelledby="certificates-title"
          >
            <div className="dashboard-section-heading compact">
              <div>
                <span className="dashboard-kicker">YOUR MILESTONES</span>
                <h2 id="certificates-title">Certificates</h2>
              </div>
              <Award size={22} aria-hidden="true" />
            </div>

            {certificates.length > 0 ? (
              <ul className="dashboard-certificate-list">
                {certificates.map(({ path, summary }) => (
                  <li key={path.id} className="dashboard-certificate">
                    <div className="dashboard-certificate-heading">
                      <span
                        className="dashboard-certificate-seal"
                        aria-hidden="true"
                      >
                        <Award size={25} />
                      </span>
                      <div>
                        <h3>{path.title}</h3>
                        <p>Reading completed · Ronak</p>
                      </div>
                    </div>
                    <div className="dashboard-certificate-actions">
                      <Link
                        href={pathRevisionHref(path.id)}
                        className="secondary-button"
                        aria-label={`Revise ${path.title}`}
                      >
                        <RotateCcw size={14} aria-hidden="true" />
                        Revise
                      </Link>
                      {summary.homeworkLessonIds.length === 1 ? (
                        <Link
                          href={`/homework/${encodeURIComponent(
                            summary.homeworkLessonIds[0],
                          )}`}
                          className="secondary-button"
                        >
                          <FileCode2 size={14} aria-hidden="true" />
                          Homework
                        </Link>
                      ) : summary.homeworkLessonIds.length > 1 ? (
                        <Link
                          href={`/homework?${new URLSearchParams({
                            path: path.id,
                          }).toString()}`}
                          className="secondary-button"
                        >
                          <FileCode2 size={14} aria-hidden="true" />
                          Homework
                        </Link>
                      ) : (
                        <span className="dashboard-footnote">
                          No homework in this path
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="dashboard-certificate-empty">
                <span className="dashboard-certificate-seal" aria-hidden="true">
                  <Award size={28} />
                </span>
                <h3>A place for your first milestone.</h3>
                <p>
                  Finish every reading lesson in a path to earn its completion
                  certificate.
                </p>
                <Link href="/paths" className="dashboard-text-link">
                  Find your starting point
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            )}

            <p className="dashboard-panel-note">
              Revision starts a fresh local reading pass. Your saved XP, completed
              labs, and homework scores stay intact.
            </p>
          </section>

          <section
            className="dashboard-panel"
            aria-labelledby="practice-title"
          >
            <div className="dashboard-section-heading compact">
              <div>
                <span className="dashboard-kicker">LEARN BY DOING</span>
                <h2 id="practice-title">Put it into practice.</h2>
              </div>
            </div>

            <div className="dashboard-practice-links">
              <Link href="/homework" className="dashboard-practice-link">
                <span className="dashboard-practice-icon">
                  <FileCode2 size={21} aria-hidden="true" />
                </span>
                <span>
                  <strong>Homework workspace</strong>
                  <small>
                    {completedHomework} fully scored{" "}
                    {completedHomework === 1 ? "question" : "questions"}
                    {" · "}Review feedback and improve
                  </small>
                </span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/ctf" className="dashboard-practice-link">
                <span className="dashboard-practice-icon purple">
                  <Flag size={21} aria-hidden="true" />
                </span>
                <span>
                  <strong>Capture the Flag</strong>
                  <small>Follow clues. Investigate. Find the answer.</small>
                </span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>

            <div className="dashboard-learning-note">
              <BookOpen size={18} aria-hidden="true" />
              <p>
                Understanding comes before speed. Revisit a lesson whenever you
                need a clearer picture.
              </p>
            </div>
          </section>
        </div>
      </div>
    </WorkspaceShell>
  );
}
