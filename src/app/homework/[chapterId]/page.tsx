import Link from "next/link";
import { notFound } from "next/navigation";
import HomeworkQuestionCard from "@/components/HomeworkQuestionCard";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import {
  homeworkChapters,
  publicQuestion,
} from "@/server/homework-catalog";
import { ChevronRight } from "lucide-react";

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

  return (
    <>
      <header className="topbar">
        <div className="breadcrumb">
          <Link href="/homework">Homework</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span>{chapter.title}</span>
        </div>
      </header>
      <header className="hero">
        <div>
          <Link href="/homework" className="eyebrow accent" style={{display: "block", marginBottom: "10px"}}>
            ← ALL HOMEWORK
          </Link>
          <h1>{chapter.title}</h1>
          <p>{chapter.description}</p>
        </div>
      </header>

      <div className="homework-list">
        {chapter.questions.map((question) => (
          <HomeworkQuestionCard
            key={question.homeworkId}
            question={publicQuestion(question)}
            bestXp={progress.homeworkBest[question.homeworkId] ?? 0}
          />
        ))}

        {chapter.questions.length === 0 && (
          <p>No homework questions have been added to this chapter yet.</p>
        )}
      </div>
    </>
  );
}
