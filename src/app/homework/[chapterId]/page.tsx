import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  FileCode2,
  FlaskConical,
  ShieldCheck,
  Terminal,
  Trophy,
} from "lucide-react";

import HomeworkQuestionCard from "@/components/HomeworkQuestionCard";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import {
  canAccessHomeworkChapter,
  homeworkChapters,
  publicQuestion,
} from "@/server/homework-catalog";

import "@/app/batch-two.css";
import "@/app/batch-three.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ChapterHomeworkPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const userId = await requireRonakId();
  const { chapterId } = await params;

  const chapter = homeworkChapters.find((item) => item.id === chapterId);
  if (!chapter) notFound();

  const progress = getProgress(userId);

  // Do not render or serialize assignment content for a locked chapter.
  if (!canAccessHomeworkChapter(chapter.id, progress.readingIds)) {
    redirect("/homework");
  }

  const earned = chapter.questions.reduce(
    (sum, question) =>
      sum +
      Math.min(
        question.totalPoints,
        Math.max(0, progress.homeworkBest[question.homeworkId] ?? 0),
      ),
    0,
  );

  const available = chapter.questions.reduce(
    (sum, question) => sum + question.totalPoints,
    0,
  );

  const totalTests = chapter.questions.reduce(
    (sum, question) => sum + question.totalTests,
    0,
  );

  const completed = chapter.questions.filter(
    (question) =>
      (progress.homeworkBest[question.homeworkId] ?? 0) >=
      question.totalPoints,
  ).length;

  const perfect = available > 0 && earned === available;

  return (
    <div className="hw-page hw-detail-page">
      <nav className="hw-breadcrumb" aria-label="Breadcrumb">
        <Link href="/homework">Homework</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">{chapter.title}</span>
      </nav>

      <header className="paths-heading hw-detail-heading">
        <div>
          <span className="dashboard-kicker">YOUR HANDS-ON MISSION</span>
          <h1>{chapter.title}</h1>
          <p>{chapter.description}</p>

          <div className="hw-heading-meta">
            <span>
              <BookOpen size={14} aria-hidden="true" />
              Reading completed
            </span>
            <span>
              <Terminal size={14} aria-hidden="true" />
              Bash homework
            </span>
            {perfect && (
              <span className="hw-perfect-badge">
                <Check size={14} aria-hidden="true" />
                Chapter completed
              </span>
            )}
          </div>
        </div>

        <span className="paths-heading-icon" aria-hidden="true">
          <Terminal size={34} />
        </span>
      </header>

      <dl className="paths-summary" aria-label="Chapter homework progress">
        <div>
          <dt>
            <FileCode2 size={16} aria-hidden="true" />
            Fully scored questions
          </dt>
          <dd>
            {completed} <span>/ {chapter.questions.length}</span>
          </dd>
        </div>
        <div>
          <dt>
            <FlaskConical size={16} aria-hidden="true" />
            Checks across this chapter
          </dt>
          <dd>{totalTests}</dd>
        </div>
        <div>
          <dt>
            <Trophy size={16} aria-hidden="true" />
            Your chapter homework XP
          </dt>
          <dd>
            {earned} <span>/ {available}</span>
          </dd>
        </div>
      </dl>

      <div className="hw-workspace">
        <section
          className="hw-assignments"
          aria-labelledby="homework-assignments-title"
        >
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-kicker">WRITE. RUN. REFINE.</span>
              <h2 id="homework-assignments-title">Your assignments</h2>
              <p>Open a mission to upload a script and inspect its results.</p>
            </div>
          </div>

          <div className="hw-question-list">
            {chapter.questions.map((question, index) => (
              <HomeworkQuestionCard
                key={question.homeworkId}
                question={publicQuestion(question)}
                questionNumber={index + 1}
                bestXp={progress.homeworkBest[question.homeworkId] ?? 0}
              />
            ))}
          </div>
        </section>

        <aside className="hw-guide" aria-labelledby="homework-guide-title">
          <span className="hw-guide-icon" aria-hidden="true">
            <ShieldCheck size={23} />
          </span>
          <span className="dashboard-kicker">YOUR WORKFLOW</span>
          <h2 id="homework-guide-title">Small changes. Better results.</h2>

          <ol className="hw-guide-steps">
            <li>
              <strong>Read the mission</strong>
              <p>Check the objective and the required output before coding.</p>
            </li>
            <li>
              <strong>Upload your script</strong>
              <p>Choose a UTF-8 Bash file ending in .sh, up to 64 KB.</p>
            </li>
            <li>
              <strong>Follow the evidence</strong>
              <p>
                Compare expected and actual output. Fix one issue at a time,
                then submit again.
              </p>
            </li>
          </ol>

          <div className="hw-guide-note">
            <Trophy size={17} aria-hidden="true" />
            <p>
              Your best score is what counts. A lower-scoring retry does not
              remove previously earned homework XP.
            </p>
          </div>

          <Link href="/homework" className="dashboard-text-link">
            <ArrowLeft size={15} aria-hidden="true" />
            Back to all homework
          </Link>
        </aside>
      </div>
    </div>
  );
}
