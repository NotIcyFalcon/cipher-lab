import {
  lessons,
  type HomeworkContentBlock,
} from "@/content/lessons";

export const HOMEWORK_PROGRESS_EVENT = "cipher-lab:progress";
const PREFIX = "cipher-lab:homework-progress:v1:";

const assignments = lessons
  .flatMap((lesson) => lesson.blocks)
  .filter(
    (block): block is HomeworkContentBlock => block.type === "homework",
  );

function storageKey(homeworkId: string, passedTests: number) {
  return `${PREFIX}${homeworkId}:${passedTests}`;
}

export function subscribeToHomeworkProgress(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(HOMEWORK_PROGRESS_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(HOMEWORK_PROGRESS_EVENT, callback);
  };
}

export function getHomeworkBestXp(homeworkId: string): number {
  const homework = assignments.find(
    (assignment) => assignment.homeworkId === homeworkId,
  );

  if (!homework) return 0;

  try {
    for (let passed = homework.testCases.length; passed > 0; passed--) {
      if (
        window.localStorage.getItem(storageKey(homeworkId, passed)) === "1"
      ) {
        return (passed * homework.totalPoints) / homework.testCases.length;
      }
    }
  } catch {
    return 0;
  }

  return 0;
}

export function readHomeworkXp(): number {
  return assignments.reduce(
    (total, homework) => total + getHomeworkBestXp(homework.homeworkId),
    0,
  );
}

export function readServerHomeworkXp(): number {
  return 0;
}

export function saveHomeworkProgress(
  homeworkId: string,
  passedTests: number,
) {
  const homework = assignments.find(
    (assignment) => assignment.homeworkId === homeworkId,
  );

  if (
    !homework ||
    !Number.isInteger(passedTests) ||
    passedTests < 0 ||
    passedTests > homework.testCases.length
  ) {
    throw new Error("Invalid homework progress.");
  }

  if (passedTests > 0) {
    window.localStorage.setItem(storageKey(homeworkId, passedTests), "1");
  }

  window.dispatchEvent(new Event(HOMEWORK_PROGRESS_EVENT));
}
