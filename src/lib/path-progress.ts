import type { LearningPath } from "@/lib/content-types";
import type { Progress } from "@/lib/progress-types";

export function getPathProgress(path: LearningPath, progress: Progress) {
  const reading = new Set(progress.readingIds);
  const completedLabs = new Set(progress.labIds);

  let readingAvailable = 0;
  let readingEarned = 0;
  let labsAvailable = 0;
  let labsEarned = 0;
  let labCount = 0;
  let completedLabCount = 0;

  for (const lesson of path.lessons) {
    readingAvailable += lesson.xp;
    if (reading.has(lesson.id)) readingEarned += lesson.xp;

    for (const block of lesson.blocks) {
      if (block.type !== "lab") continue;

      labCount++;
      labsAvailable += block.points;

      if (completedLabs.has(`${lesson.id}:${block.id}`)) {
        completedLabCount++;
        labsEarned += block.points;
      }
    }
  }

  const homeworkAvailable = path.homework.reduce(
    (sum, question) => sum + question.totalPoints,
    0,
  );

  const homeworkEarned = path.homework.reduce(
    (sum, question) =>
      sum + Math.min(
        question.totalPoints,
        Math.max(0, progress.homeworkBest[question.homeworkId] ?? 0),
      ),
    0,
  );

  const readingCount = path.lessons.filter(
    (lesson) => reading.has(lesson.id),
  ).length;

  const readingComplete =
    path.lessons.length > 0 &&
    path.lessons.every((lesson) => reading.has(lesson.id));

  const available = readingAvailable + labsAvailable + homeworkAvailable;
  const earned = readingEarned + labsEarned + homeworkEarned;

  return {
    lessons: path.lessons,
    lessonCount: path.lessons.length,
    readingCount,
    readingComplete,
    minutes: path.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0),
    labCount,
    completedLabCount,
    homeworkCount: path.homework.length,

    // Compatibility with the existing dashboard certificate links:
    // homework detail URLs now identify paths, not chapters.
    homeworkLessonIds: path.homework.length ? [path.id] : [],

    readingAvailable,
    readingEarned,
    labsAvailable,
    labsEarned,
    homeworkAvailable,
    homeworkEarned,
    available,
    earned,
    percentage: available > 0
      ? Math.min(100, Math.round(earned / available * 100))
      : 0,
    started: readingCount > 0 || earned > 0,
  };
}

export function formatLessonDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder === 0
    ? `${hours} hr`
    : `${hours} hr ${remainder} min`;
}
