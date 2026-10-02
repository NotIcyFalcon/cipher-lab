import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";

import type { HomeworkDefinition } from "@/server/homework-catalog";
import type { TestResult } from "@/lib/progress-types";

const execAsync = promisify(exec);

async function getFolderState(dirPath: string) {
  const state: Record<string, string> = {};

  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const relPath = path.relative(dirPath, fullPath).replace(/\\/g, "/");
        const content = await fs.readFile(fullPath);
        const hash = crypto.createHash("sha256").update(content).digest("hex");
        state[relPath] = hash;
      }
    }
  }

  await walk(dirPath);
  return state;
}

function computeStateDiff(initial: Record<string, string>, current: Record<string, string>) {
  const diffs: string[] = [];
  for (const [file, hash] of Object.entries(current)) {
    if (!initial[file]) diffs.push(`Added file: ${file}`);
    else if (initial[file] !== hash) diffs.push(`Modified file: ${file}`);
  }
  for (const file of Object.keys(initial)) {
    if (!current[file]) diffs.push(`Deleted file: ${file}`);
  }
  return diffs.sort().join("\n") || "No file changes.";
}

export async function runGrader(
  question: HomeworkDefinition,
  script: string,
) {
  const results: TestResult[] = [];
  let awardedXp = 0;

  for (let index = 0; index < question.testCases.length; index++) {
    const test = question.testCases[index];
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "grader-"));
    const adminDir = await fs.mkdtemp(path.join(os.tmpdir(), "grader-admin-"));
    const studentDir = await fs.mkdtemp(path.join(os.tmpdir(), "grader-student-"));

    let expectedOutput = "";
    let actualOutput = "";
    let stderr = "";
    let errorMsg = "";
    let expectedFolder = "";
    let actualFolder = "";
    let passed = false;

    try {
      // 1. Global Setup
      if (question.setupScript) {
        const globalSetupPath = path.join(baseDir, "global_setup.sh");
        await fs.writeFile(globalSetupPath, question.setupScript);
        await execAsync(`bash global_setup.sh`, { cwd: baseDir, timeout: 10000 });
        await fs.rm(globalSetupPath, { force: true });
      }

      // 2. Test Setup
      if (test.setupScript) {
        const testSetupPath = path.join(baseDir, "test_setup.sh");
        await fs.writeFile(testSetupPath, test.setupScript);
        await execAsync(`bash test_setup.sh`, { cwd: baseDir, timeout: 10000 });
        await fs.rm(testSetupPath, { force: true });
      }

      const initialState = await getFolderState(baseDir);

      await fs.cp(baseDir, adminDir, { recursive: true });
      await fs.cp(baseDir, studentDir, { recursive: true });

      // 3. Admin Solution
      const adminScriptPath = path.join(adminDir, "solution.sh");
      await fs.writeFile(adminScriptPath, question.standardSolution);
      try {
        const adminRes = await execAsync(`bash solution.sh`, { cwd: adminDir, timeout: 15000 });
        expectedOutput = adminRes.stdout.trim();
      } catch (e: unknown) {
        const err = e as { stdout?: string };
        expectedOutput = (err.stdout || "").trim();
      }
      await fs.rm(adminScriptPath, { force: true });
      const adminState = await getFolderState(adminDir);
      expectedFolder = computeStateDiff(initialState, adminState);

      // 4. Student Script
      const studentScriptPath = path.join(studentDir, "student.sh");
      await fs.writeFile(studentScriptPath, script);
      try {
        const studentRes = await execAsync(`bash student.sh`, { cwd: studentDir, timeout: 15000 });
        actualOutput = studentRes.stdout.trim();
        stderr = studentRes.stderr.trim();
      } catch (e: unknown) {
        const err = e as { stdout?: string; stderr?: string; message?: string };
        actualOutput = (err.stdout || "").trim();
        stderr = (err.stderr || err.message || "").trim();
      }
      await fs.rm(studentScriptPath, { force: true });
      const studentState = await getFolderState(studentDir);
      actualFolder = computeStateDiff(initialState, studentState);

      // 5. Compare
      passed = (expectedOutput === actualOutput) && (expectedFolder === actualFolder);
      if (passed) {
        awardedXp += test.xpReward;
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      errorMsg = err.message || "Unknown error";
      passed = false;
    } finally {
      await fs.rm(baseDir, { recursive: true, force: true }).catch(() => {});
      await fs.rm(adminDir, { recursive: true, force: true }).catch(() => {});
      await fs.rm(studentDir, { recursive: true, force: true }).catch(() => {});
    }

    results.push({
      publicVersion: 8,
      testId: test.id,
      name: test.hidden ? `Hidden test ${index + 1}` : `Test ${index + 1}`,
      passed,
      points: passed ? test.xpReward : 0,
      maxPoints: test.xpReward,
      hidden: test.hidden,
      assertionType: "folder",
      expectedOutput: test.hidden ? "[Hidden]" : expectedOutput,
      actualOutput: test.hidden ? "[Hidden]" : actualOutput,
      expectedFolder: test.hidden ? "[Hidden]" : expectedFolder,
      actualFolder: test.hidden ? "[Hidden]" : actualFolder,
      stderr: test.hidden ? "" : stderr,
      error: test.hidden ? "" : errorMsg,
    });
  }

  const passedTests = results.filter((result) => result.passed).length;
  if (passedTests === question.testCases.length) {
    awardedXp += question.baseXp;
  }

  return { passedTests, awardedXp, results };
}
