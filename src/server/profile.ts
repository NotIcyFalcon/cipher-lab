import "server-only";

import { getPaths } from "@/server/catalog";
import { getPathProgress } from "@/lib/path-progress";
import { getDb } from "@/server/db";
import { getProgress } from "@/server/progress";
import { getCTFCatalogProgress } from "@/server/ctf";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Twenty weeks of activity, aligned so each column is a Monday-to-Sunday week. */
const HEATMAP_WEEKS = 20;
const SUBMISSION_WINDOW_DAYS = 28;
const RECENT_EVENTS = 8;

export type ProfileField = {
  id: string;
  name: string;
  earned: number;
  available: number;
  percentage: number;
};

export type ProfileActivityDay = {
  date: string;
  /** All learning actions that day: chapters read, labs, CTF captures, homework submissions. */
  count: number;
  reading: number;
  labs: number;
  ctf: number;
  homework: number;
};

export type ProfileEventKind = "reading" | "lab" | "ctf" | "homework";

export type ProfileEvent = {
  kind: ProfileEventKind;
  title: string;
  detail: string;
  at: number;
  xp: number | null;
};

export type ProfilePathProgress = {
  id: string;
  title: string;
  topicName: string;
  percentage: number;
  earned: number;
  available: number;
  readingCount: number;
  lessonCount: number;
  complete: boolean;
};

function utcDayStart(date: Date) {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

const dayKey = (milliseconds: number) => new Date(milliseconds).toISOString().slice(0, 10);

/**
 * Timestamps come in three shapes: SQLite CURRENT_TIMESTAMP text in UTC
 * ("2026-10-04 07:09:07"), Unix seconds, or Unix milliseconds. Display code
 * normalizes them without changing storage.
 */
function timestampMilliseconds(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    return value < 100_000_000_000 ? value * 1000 : value;
  }

  if (typeof value === "string" && value.trim()) {
    const text = value.trim();
    if (/^\d+(\.\d+)?$/.test(text)) return timestampMilliseconds(Number(text));

    const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(text) ? text : `${text.replace(" ", "T")}Z`;
    const parsed = Date.parse(iso);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

type CompletionRow = { ref: string; xp: number; at: unknown };
type SubmissionRow = {
  questionId: string | null;
  homeworkId: string;
  at: unknown;
  status: "pending" | "graded" | "error";
  awardedXp: number;
  passedTests: number;
  totalTests: number;
};

export function getProfileDashboard(userId: string, now = new Date()) {
  const db = getDb();
  const progress = getProgress(userId);
  const ctfCategories = getCTFCatalogProgress(userId);
  const paths = getPaths();

  const pathEntries = paths.map((path) => ({
    path,
    stats: getPathProgress(path, progress),
  }));

  // ---- Field map: earned share of each topic's points (paths + CTF). ----

  const fieldsByName = new Map<string, Omit<ProfileField, "percentage">>();

  function addField(name: string, earned: number, available: number) {
    const id = name.trim().toLowerCase();
    if (!id) return;

    const previous = fieldsByName.get(id);

    fieldsByName.set(id, {
      id,
      name: previous?.name ?? name,
      earned: (previous?.earned ?? 0) + Math.max(0, earned),
      available: (previous?.available ?? 0) + Math.max(0, available),
    });
  }

  for (const { path, stats } of pathEntries) {
    addField(path.topicName, stats.earned, stats.available);
  }

  for (const category of ctfCategories) {
    addField(category.name, category.earnedXp, category.achievableXp);
  }

  const fields: ProfileField[] = Array.from(fieldsByName.values()).map(
    (field) => ({
      ...field,
      percentage:
        field.available > 0
          ? Math.min(100, Math.max(0, Math.round((field.earned / field.available) * 100)))
          : 0,
    }),
  );

  // ---- Lookup tables for activity titles. ----

  const lessonTitles = new Map<string, { title: string; pathTitle: string }>();
  const labTitles = new Map<string, { title: string; pathTitle: string }>();
  const questionTitles = new Map<string, { title: string; homeworkTitle: string; totalPoints: number }>();

  for (const path of paths) {
    for (const lesson of path.lessons) {
      lessonTitles.set(lesson.id, { title: lesson.title, pathTitle: path.title });
      for (const block of lesson.blocks) {
        if (block.type === "lab") {
          labTitles.set(`${lesson.id}:${block.id}`, {
            title: block.title || lesson.title,
            pathTitle: path.title,
          });
        }
      }
    }
    for (const question of path.homework) {
      questionTitles.set(question.questionId, {
        title: question.title,
        homeworkTitle: question.homeworkTitle || path.title,
        totalPoints: question.totalPoints,
      });
    }
  }

  const challengeTitles = new Map<string, { title: string; ctfName: string }>();
  for (const category of ctfCategories) {
    for (const ctf of category.ctfs) {
      for (const universe of ctf.universes) {
        for (const challenge of universe.challenges) {
          challengeTitles.set(challenge.id, { title: challenge.title, ctfName: ctf.name });
        }
      }
    }
  }

  // ---- Activity rows. Per-user tables are small; homework is capped. ----

  const readingRows = db.prepare(`
    SELECT lesson_id AS ref, xp, completed_at AS at
    FROM reading_progress
    WHERE user_id = ?
  `).all(userId) as CompletionRow[];

  const labRows = db.prepare(`
    SELECT challenge_id AS ref, xp, completed_at AS at
    FROM lab_completions
    WHERE user_id = ?
  `).all(userId) as CompletionRow[];

  const ctfRows = db.prepare(`
    SELECT challenge_id AS ref, awarded_xp AS xp, completed_at AS at
    FROM ctf_completions
    WHERE user_id = ?
  `).all(userId) as CompletionRow[];

  const submissionRows = db.prepare(`
    SELECT
      question_id AS questionId,
      homework_id AS homeworkId,
      created_at AS at,
      status,
      awarded_xp AS awardedXp,
      passed_tests AS passedTests,
      total_tests AS totalTests
    FROM homework_submissions
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT 1000
  `).all(userId) as SubmissionRow[];

  const submissionTotal = db.prepare(`
    SELECT COUNT(*) AS count
    FROM homework_submissions
    WHERE user_id = ?
  `).get(userId) as { count: number };

  // ---- Heatmap: Monday-aligned weeks ending with the current week. ----

  const today = utcDayStart(now);
  const weekday = (new Date(today).getUTCDay() + 6) % 7; // Monday = 0
  const firstDay = today - (weekday + (HEATMAP_WEEKS - 1) * 7) * DAY_MS;
  const dayCount = Math.round((today - firstDay) / DAY_MS) + 1;

  const activity: ProfileActivityDay[] = Array.from({ length: dayCount }, (_, index) => ({
    date: dayKey(firstDay + index * DAY_MS),
    count: 0,
    reading: 0,
    labs: 0,
    ctf: 0,
    homework: 0,
  }));
  const activityByDate = new Map(activity.map((day) => [day.date, day]));
  const activeDaySet = new Set<string>();

  function record(at: number | null, key: "reading" | "labs" | "ctf" | "homework") {
    if (at === null) return;
    const date = dayKey(at);
    activeDaySet.add(date);
    const day = activityByDate.get(date);
    if (!day) return;
    day[key] += 1;
    day.count += 1;
  }

  const events: ProfileEvent[] = [];

  for (const row of readingRows) {
    const at = timestampMilliseconds(row.at);
    record(at, "reading");
    const lesson = lessonTitles.get(row.ref);
    if (at !== null && lesson) {
      events.push({ kind: "reading", title: lesson.title, detail: lesson.pathTitle, at, xp: row.xp });
    }
  }

  for (const row of labRows) {
    const at = timestampMilliseconds(row.at);
    record(at, "labs");
    const lab = labTitles.get(row.ref);
    if (at !== null) {
      events.push({
        kind: "lab",
        title: lab?.title ?? "Lab completed",
        detail: lab?.pathTitle ?? "Hands-on lab",
        at,
        xp: row.xp,
      });
    }
  }

  for (const row of ctfRows) {
    const at = timestampMilliseconds(row.at);
    record(at, "ctf");
    const challenge = challengeTitles.get(row.ref);
    if (at !== null) {
      events.push({
        kind: "ctf",
        title: challenge?.title ?? "Flag captured",
        detail: challenge?.ctfName ?? "CTF",
        at,
        xp: row.xp,
      });
    }
  }

  submissionRows.forEach((row, index) => {
    const at = timestampMilliseconds(row.at);
    record(at, "homework");
    // Only the newest submissions can make the recent list.
    if (at === null || index >= RECENT_EVENTS) return;
    const question = row.questionId ? questionTitles.get(row.questionId) : undefined;
    const detail =
      row.status === "pending"
        ? "Grading…"
        : row.status === "error"
          ? "Could not be graded"
          : `${row.passedTests}/${row.totalTests} tests passed`;
    events.push({
      kind: "homework",
      title: question?.title ?? "Homework submission",
      detail: question ? `${question.homeworkTitle} · ${detail}` : detail,
      at,
      xp: row.status === "graded" ? row.awardedXp : null,
    });
  });

  events.sort((a, b) => b.at - a.at);

  // ---- Streaks (any learning action counts). ----

  let currentStreak = 0;
  {
    // A streak stays alive until the end of today, so start from yesterday
    // when nothing has happened yet today.
    let cursor = activeDaySet.has(dayKey(today)) ? today : today - DAY_MS;
    while (activeDaySet.has(dayKey(cursor))) {
      currentStreak += 1;
      cursor -= DAY_MS;
    }
  }

  let longestStreak = 0;
  {
    const days = [...activeDaySet].map((date) => Date.parse(`${date}T00:00:00Z`)).sort((a, b) => a - b);
    let run = 0;
    let previous = Number.NaN;
    for (const day of days) {
      run = day - previous === DAY_MS ? run + 1 : 1;
      longestStreak = Math.max(longestStreak, run);
      previous = day;
    }
  }

  // ---- Submission stats (last 28 days). ----

  const submissionWindowStart = today - (SUBMISSION_WINDOW_DAYS - 1) * DAY_MS;
  const recentSubmissionCount = submissionRows.filter((row) => {
    const at = timestampMilliseconds(row.at);
    return at !== null && at >= submissionWindowStart && at <= now.getTime();
  }).length;

  const activeDays = activity.filter((day) => day.count > 0).length;

  // ---- Totals and level. ----

  // getCTFCatalogProgress applies hint penalties to achievable XP; they are
  // not subtracted from the total a second time.
  const hintPenaltyXp = ctfCategories.reduce((sum, category) => sum + category.penaltyXp, 0);

  const readingCount = pathEntries.reduce((sum, { stats }) => sum + stats.readingCount, 0);
  const lessonCount = pathEntries.reduce((sum, { stats }) => sum + stats.lessonCount, 0);
  const completedLabCount = pathEntries.reduce((sum, { stats }) => sum + stats.completedLabCount, 0);
  const labCount = pathEntries.reduce((sum, { stats }) => sum + stats.labCount, 0);
  const completedChallengeCount = ctfCategories.reduce((sum, category) => sum + category.completedCount, 0);
  const challengeCount = ctfCategories.reduce((sum, category) => sum + category.challengeCount, 0);

  let homeworkQuestionCount = 0;
  let solvedQuestionCount = 0;
  for (const [questionId, question] of questionTitles) {
    homeworkQuestionCount += 1;
    if ((progress.homeworkQuestionBest[questionId] ?? 0) >= question.totalPoints && question.totalPoints > 0) {
      solvedQuestionCount += 1;
    }
  }

  const totalXp = progress.readingXp + progress.labsXp + progress.homeworkXp + progress.ctfXp;

  const levelSize = 500;
  const level = Math.floor(totalXp / levelSize) + 1;
  const levelXp = totalXp % levelSize;

  // ---- Paths: in progress first, then not started, then complete. ----

  const pathProgress: ProfilePathProgress[] = pathEntries
    .filter(({ stats }) => stats.lessonCount > 0 || stats.available > 0)
    .map(({ path, stats }) => ({
      id: path.id,
      title: path.title,
      topicName: path.topicName,
      percentage: stats.percentage,
      earned: stats.earned,
      available: stats.available,
      readingCount: stats.readingCount,
      lessonCount: stats.lessonCount,
      complete: stats.available > 0 && stats.earned >= stats.available && stats.readingComplete,
    }))
    .sort((a, b) => {
      const rank = (entry: ProfilePathProgress) =>
        entry.complete ? 2 : entry.percentage > 0 || entry.readingCount > 0 ? 0 : 1;
      return rank(a) - rank(b) || b.percentage - a.percentage || a.title.localeCompare(b.title);
    });

  return {
    generatedAt: now.getTime(),
    fields,
    activity,
    heatmapWeeks: HEATMAP_WEEKS,
    recentEvents: events.slice(0, RECENT_EVENTS),
    pathProgress,
    totalXp,
    readingXp: progress.readingXp,
    labsXp: progress.labsXp,
    homeworkXp: progress.homeworkXp,
    ctfXp: progress.ctfXp,
    readingCount,
    lessonCount,
    completedLabCount,
    labCount,
    completedChallengeCount,
    challengeCount,
    homeworkQuestionCount,
    solvedQuestionCount,
    hintPenaltyXp,
    submissionCount: submissionTotal.count,
    recentSubmissionCount,
    activeDays,
    currentStreak,
    longestStreak,
    level,
    levelXp,
    levelSize,
    nextLevelRemaining: levelSize - levelXp,
  };
}
