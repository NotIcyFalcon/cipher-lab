import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Eye, ListChecks, Lock, Trophy } from "lucide-react";
import HomeworkQuestionCard from "@/components/HomeworkQuestionCard";
import { pathHref } from "@/lib/path-links";
import { getPathProgress } from "@/lib/path-progress";
import { getPaths } from "@/server/catalog";
import { requireUserId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import { isHomeworkPathUnlocked } from "@/server/homework-catalog";
import "@/styles/pages/catalog.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomeworkPathPage({
  params,
}: {
  params: Promise<{ pathId: string }>;
}) {
  const userId = await requireUserId();
  const { pathId } = await params;
  const path = getPaths().find((item) => item.id === pathId);

  if (!path) notFound();

  const unlocked = isHomeworkPathUnlocked(userId, path.id);
  const progress = getProgress(userId);
  const stats = getPathProgress(path, progress);

  const solved = path.homework.filter(
    (question) =>
      question.totalPoints > 0 &&
      (progress.homeworkQuestionBest[question.questionId] ?? 0) >= question.totalPoints,
  ).length;

  return (
    <>
      <header className="ui-page-head cat-hero">
        <div className="cat-hero-copy">
          <nav aria-label="Breadcrumb">
            <ol className="ui-breadcrumb">
              <li>
                <Link href="/homework">
                  <ArrowLeft size={13} aria-hidden="true" />
                  Homework
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">{path.topicName}</li>
            </ol>
          </nav>
          <h1 className="ui-title">{path.title}</h1>
          <p className="ui-lede">
            Write a script for each question. It runs against hidden and visible tests; you get the expected and
            actual output for every test that fails.
          </p>
          {unlocked && !stats.readingComplete && (
            <span className="ui-badge ui-badge-accent">
              <Eye size={11} aria-hidden="true" />
              Admin preview
            </span>
          )}
        </div>
        <dl className="cat-hero-stats" aria-label="Assignment overview">
          <div>
            <dt>
              <ListChecks size={14} aria-hidden="true" />
              Solved
            </dt>
            <dd>
              {solved} <span>/ {path.homework.length}</span>
            </dd>
          </div>
          <div>
            <dt>
              <Trophy size={14} aria-hidden="true" />
              XP
            </dt>
            <dd>
              {stats.homeworkEarned} <span>/ {stats.homeworkAvailable}</span>
            </dd>
          </div>
          <div>
            <dt>
              <BookOpen size={14} aria-hidden="true" />
              Chapters read
            </dt>
            <dd>
              {stats.readingCount} <span>/ {stats.lessonCount}</span>
            </dd>
          </div>
        </dl>
      </header>

      {!unlocked ? (
        <section className="ui-notice ui-notice-warning cat-locked" aria-labelledby="homework-locked-title">
          <Lock size={18} aria-hidden="true" />
          <div>
            <strong id="homework-locked-title">Complete {path.title} to unlock</strong>
            <p>
              You have read {stats.readingCount} of {stats.lessonCount} chapters. Finish the rest and these questions
              open automatically.
            </p>
          </div>
          <Link href={pathHref(path.id)} className="ui-btn ui-btn-primary ui-btn-sm">
            Continue reading
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <div className="cat-questions">
          {path.homework.map((question, index) => (
            <HomeworkQuestionCard
              key={question.questionId}
              question={question}
              questionNumber={index + 1}
              bestXp={progress.homeworkQuestionBest[question.questionId] ?? 0}
            />
          ))}
        </div>
      )}
    </>
  );
}
