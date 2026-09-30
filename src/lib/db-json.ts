import fs from "node:fs/promises";
import path from "node:path";
import type { HomeworkGradeResponse } from "./homework-types";

const DB_PATH = path.join(process.cwd(), ".data", "db.json");

interface DB {
  user: {
    xp: number;
    username: string;
  };
  readingProgress: string[]; // array of lesson IDs
  homeworkSubmissions: Array<HomeworkGradeResponse & { timestamp: number }>;
}

const DEFAULT_DB: DB = {
  user: { xp: 0, username: "Ronak" },
  readingProgress: [],
  homeworkSubmissions: [],
};

export async function getDb(): Promise<DB> {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data) as DB;
  } catch {
    return DEFAULT_DB;
  }
}

export async function saveDb(db: DB) {
  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("Failed to save DB:", err);
  }
}
