import { lessons, type Lesson } from "@/content/lessons";
import type { Progress } from "@/lib/progress-types";

// Matches the current completeLab Server Action.
// No scoring changes are introduced in Batch 1.
const LAB_XP = 50;

type PathLike = {
  lessonIds: readonly string[];
};

export function getPathProgress(path: PathLike, progress: Progress) {
  const reading = new Set(progress.readingIds);
  const completedLabs = new Set(progress.labIds);

  const pathLessons = path.lessonIds
    .map((id) => lessons.find((lesson) => lesson.id === id))
    .filter((lesson): lesson is Lesson => lesson !== undefined);

  let readingAvailable = 0;
  let readingEarned = 0;
  let labsAvailable = 0;
  let labsEarned = 0;
  let homeworkAvailable = 0;
  let homeworkEarned = 0;
  let labCount = 0;
  let completedLabCount = 0;

  const homeworkIds = new Set<string>();
  const homeworkLessonIds = new Set<string>();

  for (const lesson of pathLessons) {
    readingAvailable += lesson.xp;
    if (reading.has(lesson.id)) {
      readingEarned += lesson.xp;
    }

    for (const block of lesson.blocks) {
      if (block.type === "lab") {
        labCount += 1;
        labsAvailable += LAB_XP;
        if (completedLabs.has(`${lesson.id}:${block.id}`)) {
          completedLabCount += 1;
          labsEarned += LAB_XP;
        }
      }

      if (block.type === "homework") {
        homeworkLessonIds.add(lesson.id);
        // A homework definition contributes once per path.
        if (!homeworkIds.has(block.homeworkId)) {
          homeworkIds.add(block.homeworkId);
          homeworkAvailable += block.totalPoints;
          homeworkEarned += Math.min(
            block.totalPoints,
            Math.max(0, progress.homeworkBest[block.homeworkId] ?? 0),
          );
        }
      }
    }
  }

  const readingCount = pathLessons.filter((lesson) =>
    reading.has(lesson.id),
  ).length;

  const available = readingAvailable + labsAvailable + homeworkAvailable;
  const earned = readingEarned + labsEarned + homeworkEarned;

  const readingComplete =
    path.lessonIds.length > 0 &&
    path.lessonIds.every((id) => reading.has(id));

  return {
    lessons: pathLessons,
    lessonCount: pathLessons.length,
    readingCount,
    readingComplete,
    minutes: pathLessons.reduce((sum, lesson) => sum + lesson.minutes, 0),
    labCount,
    completedLabCount,
    homeworkCount: homeworkIds.size,
    homeworkLessonIds: [...homeworkLessonIds],
    readingAvailable,
    readingEarned,
    labsAvailable,
    labsEarned,
    homeworkAvailable,
    homeworkEarned,
    available,
    earned,
    percentage: available > 0 ? Math.round((earned / available) * 100) : 0,
    started: readingCount > 0 || earned > 0,
  };
}

export function formatLessonDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}
