import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import { homeworkChapters } from "@/server/homework-catalog";

export default async function HomeworkPage() {
  const userId = await requireRonakId();
  const progress = getProgress(userId);

  return (
    <>
      <header className="topbar">
        <div className="breadcrumb">
          <span>Homework</span>
        </div>
      </header>
      <header className="hero">
        <div>
          <span className="eyebrow accent">PRACTICE YOUR SKILLS</span>
          <h1>Homework</h1>
          <p>
            Choose a chapter, submit your Bash scripts, and improve your best
            score.
          </p>
        </div>
      </header>

      <ul className="path-grid">
        {homeworkChapters.map((chapter) => {
          const earned = chapter.questions.reduce(
            (sum, question) =>
              sum + (progress.homeworkBest[question.homeworkId] ?? 0),
            0,
          );

          const available = chapter.questions.reduce(
            (sum, question) => sum + question.totalPoints,
            0,
          );

          const solved = chapter.questions.filter(
            (question) =>
              (progress.homeworkBest[question.homeworkId] ?? 0) >=
              question.totalPoints,
          ).length;

          return (
            <li key={chapter.id}>
              <Link
                href={`/homework/${encodeURIComponent(chapter.id)}`}
                className="path-card homework-path-card"
              >
                <div className="path-title">
                  <h2>{chapter.title}</h2>
                  <ArrowUpRight size={20} aria-hidden="true" />
                </div>

                <p>{chapter.description}</p>

                <div className="path-tags">
                  <span className="pill">
                    {chapter.questions.length} questions
                  </span>
                  <span className="pill">{solved} solved</span>
                  <span className="pill">
                    {earned} / {available} XP
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
