import "server-only";

import { getPaths } from "@/server/catalog";
import { getPathProgress } from "@/lib/path-progress";
import { getDb } from "@/server/db";
import { getProgress } from "@/server/progress";
import { getCTFCatalogProgress } from "@/server/ctf";

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_DAYS = 28;

export type ProfileField = {
  id: string;
  name: string;
  earned: number;
  available: number;
  percentage: number;
};

export type ProfileActivityDay = {
  date: string;
  count: number;
};

type SubmissionActivityRow = {
  createdAt: number;
};

function utcDayStart(date: Date) {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

/**
 * Existing installations may store Unix seconds or milliseconds.
 * Profile display normalizes either representation without changing storage.
 */
function timestampMilliseconds(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;

  const milliseconds = value < 100_000_000_000 ? value * 1000 : value;
  const date = new Date(milliseconds);

  return Number.isFinite(date.getTime()) ? date.getTime() : null;
}

export function getProfileDashboard(userId: string, now = new Date()) {
  const progress = getProgress(userId);
  const ctfCategories = getCTFCatalogProgress(userId);

  const paths = getPaths();

  const pathEntries = paths.map((path) => ({
    path,
    stats: getPathProgress(path, progress),
  }));

  const fieldsByName = new Map<
    string,
    Omit<ProfileField, "percentage">
  >();

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
    addField(path.title, stats.earned, stats.available);
  }

  for (const category of ctfCategories) {
    addField(category.name, category.earnedXp, category.achievableXp);
  }

  const fields: ProfileField[] = Array.from(fieldsByName.values()).map(
    (field) => ({
      ...field,
      percentage:
        field.available > 0
          ? Math.min(
              100,
              Math.max(0, Math.round((field.earned / field.available) * 100)),
            )
          : 0,
    }),
  );

  const today = utcDayStart(now);
  const firstDay = today - (ACTIVITY_DAYS - 1) * DAY_MS;

  const activity: ProfileActivityDay[] = Array.from(
    { length: ACTIVITY_DAYS },
    (_, index) => ({
      date: new Date(firstDay + index * DAY_MS).toISOString().slice(0, 10),
      count: 0,
    }),
  );

  const activityByDate = new Map(
    activity.map((day) => [day.date, day]),
  );

  const db = getDb();

  const submissionTotal = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM homework_submissions
      WHERE user_id = ?
    `)
    .get(userId) as { count: number };

  // Normalize timestamps in SQL only for filtering. Raw values are retained
  // for display normalization below.
  const recentSubmissions = db
    .prepare(`
      SELECT created_at AS createdAt
      FROM homework_submissions
      WHERE user_id = ?
        AND (
          CASE
            WHEN created_at < 100000000000
              THEN created_at * 1000
            ELSE created_at
          END
        ) >= ?
        AND (
          CASE
            WHEN created_at < 100000000000
              THEN created_at * 1000
            ELSE created_at
          END
        ) <= ?
      ORDER BY created_at
    `)
    .all(userId, firstDay, now.getTime()) as SubmissionActivityRow[];

  for (const submission of recentSubmissions) {
    const milliseconds = timestampMilliseconds(submission.createdAt);
    if (milliseconds === null) continue;

    const key = new Date(milliseconds).toISOString().slice(0, 10);
    const day = activityByDate.get(key);

    if (day) day.count += 1;
  }

  const recentSubmissionCount = activity.reduce(
    (sum, day) => sum + day.count,
    0,
  );
  const activeDays = activity.filter((day) => day.count > 0).length;

  // getCTFCatalogProgress reads ctf_hint_unlocks and applies the matching
  // server-side hint penalties. Do not subtract these from Total XP again.
  const hintPenaltyXp = ctfCategories.reduce(
    (sum, category) => sum + category.penaltyXp,
    0,
  );

  const readingCount = pathEntries.reduce(
    (sum, { stats }) => sum + stats.readingCount,
    0,
  );
  const completedLabCount = pathEntries.reduce(
    (sum, { stats }) => sum + stats.completedLabCount,
    0,
  );
  const completedChallengeCount = ctfCategories.reduce(
    (sum, category) => sum + category.completedCount,
    0,
  );

  // Reading/lab/homework XP use the existing account totals.
  // CTF uses completion records, matching getProgress's authoritative ctfXp.
  const totalXp =
    progress.readingXp +
    progress.labsXp +
    progress.homeworkXp +
    progress.ctfXp;

  const levelSize = 500;
  const level = Math.floor(totalXp / levelSize) + 1;
  const levelXp = totalXp % levelSize;

  return {
    fields,
    activity,
    totalXp,
    readingXp: progress.readingXp,
    labsXp: progress.labsXp,
    homeworkXp: progress.homeworkXp,
    ctfXp: progress.ctfXp,
    readingCount,
    completedLabCount,
    completedChallengeCount,
    hintPenaltyXp,
    submissionCount: submissionTotal.count,
    recentSubmissionCount,
    activeDays,
    weeklyAverage: recentSubmissionCount / 4,
    level,
    levelXp,
    levelSize,
    nextLevelRemaining: levelSize - levelXp,
  };
}
