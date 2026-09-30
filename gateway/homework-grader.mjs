import http from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";

const SCRIPT_LIMIT = 32 * 1024;
const BODY_LIMIT = 256 * 1024;
const OUTPUT_LIMIT = 64 * 1024;
const JOB_TIMEOUT = 20_000;
const MEMORY_LIMIT = 64 * 1024 * 1024;

class GradingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function normalizeOutput(value) {
  // Preserve spaces and case; ignore line-ending format and final newlines.
  return value.replace(/\r\n/g, "\n").replace(/\n+$/, "");
}

function decodeDockerOutput(buffer) {
  const stdout = [];
  const stderr = [];
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      throw new Error("Incomplete Docker output header.");
    }

    const stream = buffer[offset];
    const length = buffer.readUInt32BE(offset + 4);
    offset += 8;

    if (offset + length > buffer.length || ![1, 2].includes(stream)) {
      throw new Error("Invalid Docker output frame.");
    }

    const chunk = buffer.subarray(offset, offset + length);
    (stream === 1 ? stdout : stderr).push(chunk);
    offset += length;
  }

  return {
    stdout: Buffer.concat(stdout).toString("utf8"),
    stderr: Buffer.concat(stderr).toString("utf8"),
  };
}

function validateSubmission(value) {
  if (!value || typeof value !== "object") {
    throw new GradingError("Invalid submission.");
  }

  const { scriptContent, homeworkId, totalPoints, testCases } = value;

  if (
    typeof scriptContent !== "string" ||
    !scriptContent.trim() ||
    scriptContent.includes("\0") ||
    Buffer.byteLength(scriptContent, "utf8") > SCRIPT_LIMIT
  ) {
    throw new GradingError("Submit a nonempty UTF-8 script up to 32 KiB.");
  }

  if (
    typeof homeworkId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,120}$/.test(homeworkId) ||
    !Array.isArray(testCases) ||
    testCases.length === 0 ||
    testCases.length > 8 ||
    !Number.isSafeInteger(totalPoints) ||
    totalPoints <= 0 ||
    totalPoints > 10_000 ||
    totalPoints % testCases.length !== 0
  ) {
    throw new GradingError("Invalid homework configuration.");
  }

  const ids = new Set();

  for (const test of testCases) {
    if (
      !test ||
      typeof test.id !== "string" ||
      !test.id ||
      ids.has(test.id) ||
      typeof test.title !== "string" ||
      test.title.length > 200 ||
      (
        test.evaluationCommand !== undefined &&
        (
          typeof test.evaluationCommand !== "string" ||
          !test.evaluationCommand.trim() ||
          test.evaluationCommand.length > 4096
        )
      ) ||
      (
        test.expectedOutput !== undefined &&
        (
          typeof test.expectedOutput !== "string" ||
          test.expectedOutput.length > 4096
        )
      ) ||
      (
        test.evaluationCommand === undefined &&
        test.expectedOutput === undefined
      )
    ) {
      throw new GradingError("Invalid homework test case.");
    }

    ids.add(test.id);
  }
}

function authorized(header, token) {
  const supplied = Buffer.from(
    typeof header === "string" ? header : "",
  );
  const expected = Buffer.from(`Bearer ${token}`);

  return (
    supplied.length === expected.length &&
    timingSafeEqual(supplied, expected)
  );
}

async function readJson(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;

    if (size > BODY_LIMIT) {
      throw new GradingError("Submission is too large.", 413);
    }

    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new GradingError("Invalid JSON.");
  }
}

export function startHomeworkGrader(dockerAPI, composeProject) {
  const token = process.env.GRADER_INTERNAL_TOKEN;

  if (!token || token.length < 32) {
    throw new Error("Set GRADER_INTERNAL_TOKEN to a strong shared secret.");
  }

  const slotName = `${composeProject}-homework-grader`;
  const slotPath = `/containers/${encodeURIComponent(slotName)}`;
  const image = process.env.GRADER_IMAGE ?? "cyberbox-homework:1";

  async function removeContainer(id) {
    const response = await dockerAPI(
      "DELETE",
      `/containers/${encodeURIComponent(id)}?force=true&v=true`,
      null,
      { timeoutMs: 5000 },
    );

    if (![204, 404].includes(response.status)) {
      throw new Error(`Container cleanup failed: HTTP ${response.status}`);
    }
  }

  async function grade(submission) {
    validateSubmission(submission);

    const { homeworkId, scriptContent, totalPoints, testCases } = submission;
    const jobId = randomUUID();
    const deadline = Date.now() + JOB_TIMEOUT;
    let containerId;

    async function api(method, path, body = null, options = {}) {
      const remaining = deadline - Date.now();

      if (remaining <= 0) {
        throw new GradingError("Grading exceeded its time limit.", 422);
      }

      const {
        statuses = [200],
        timeoutMs = 3000,
        raw = false,
      } = options;

      const response = await dockerAPI(method, path, body, {
        raw,
        timeoutMs: Math.min(timeoutMs, remaining),
        maxBytes: raw ? OUTPUT_LIMIT : 1024 * 1024,
      });

      if (!statuses.includes(response.status)) {
        throw new Error(`Docker operation failed: HTTP ${response.status}`);
      }

      return response;
    }

    async function exec(command, timeoutMs = 2000) {
      const created = await api(
        "POST",
        `/containers/${containerId}/exec`,
        {
          User: "10001:10001",
          WorkingDir: "/work",
          AttachStdout: true,
          AttachStderr: true,
          AttachStdin: false,
          Tty: false,
          Cmd: command,
        },
        { statuses: [201] },
      );

      const execId = created.data.Id;

      const response = await api(
        "POST",
        `/exec/${execId}/start`,
        { Detach: false, Tty: false },
        { raw: true, timeoutMs },
      );

      let inspected = await api("GET", `/exec/${execId}/json`);

      // Account for the short interval between stream closure and exit status.
      while (inspected.data.Running) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        inspected = await api("GET", `/exec/${execId}/json`);
      }

      if (!Number.isInteger(inspected.data.ExitCode)) {
        throw new Error("Docker did not return an execution exit code.");
      }

      return {
        ...decodeDockerOutput(response.data),
        exitCode: inspected.data.ExitCode,
      };
    }

    const bash = (command) => [
      "/bin/bash",
      "--noprofile",
      "--norc",
      "-c",
      command,
    ];

    try {
      // Recover a container left in "created" state by a gateway crash.
      const existing = await api("GET", `${slotPath}/json`, null, {
        statuses: [200, 404],
      });

      if (existing.status === 200) {
        const ours =
          existing.data.Config?.Labels?.["cyberbox.kind"] === "homework";
        const age = Date.now() - Date.parse(existing.data.Created);

        if (!ours || !Number.isFinite(age) || age < 90_000) {
          throw new GradingError(
            "The grader is busy. Please try again shortly.",
            503,
          );
        }

        await removeContainer(existing.data.Id);
      }

      // Docker's unique container name provides a lock across requests/processes.
      const created = await api(
        "POST",
        `/containers/create?name=${encodeURIComponent(slotName)}`,
        {
          Image: image,
          User: "65534:65534",
          WorkingDir: "/",
          Cmd: ["/bin/sleep", "30"],
          Env: [
            "HOME=/work",
            "PATH=/usr/local/bin:/usr/bin:/bin",
            "LANG=C",
            "LC_ALL=C",
            "BASH_ENV=/dev/null",
            "ENV=/dev/null",
          ],
          Labels: {
            "cyberbox.kind": "homework",
            "cyberbox.job": jobId,
          },
          NetworkDisabled: true,
          HostConfig: {
            AutoRemove: true,
            Init: true,
            NetworkMode: "none",
            ReadonlyRootfs: true,
            CapDrop: ["ALL"],
            SecurityOpt: ["no-new-privileges:true"],
            Memory: MEMORY_LIMIT,
            MemorySwap: MEMORY_LIMIT,
            NanoCpus: 500_000_000,
            PidsLimit: 32,
            ShmSize: 1024 * 1024,
            Ulimits: [
              { Name: "nofile", Soft: 128, Hard: 128 },
              { Name: "core", Soft: 0, Hard: 0 },
            ],
            Tmpfs: {
              "/work":
                "rw,noexec,nosuid,nodev,size=16m,uid=10001,gid=10001,mode=0700",
              "/tmp": "rw,noexec,nosuid,nodev,size=8m,mode=1777",
            },
            LogConfig: { Type: "none", Config: {} },
          },
        },
        { statuses: [201, 409] },
      );

      if (created.status === 409) {
        throw new GradingError(
          "The grader is busy. Please try again shortly.",
          503,
        );
      }

      containerId = created.data.Id;

      await api("POST", `/containers/${containerId}/start`, null, {
        statuses: [204, 304],
      });

      // Pass script bytes as a positional argument, never as shell source.
      const encoded = Buffer.from(scriptContent, "utf8").toString("base64");

      const injected = await exec([
        ...bash(
          'printf "%s" "$1" | /bin/busybox base64 -d > /work/submission.sh',
        ),
        "inject",
        encoded,
      ]);

      if (injected.exitCode !== 0) {
        throw new Error("Could not inject the homework script.");
      }

      const script = await exec(
        ["/bin/bash", "--noprofile", "--norc", "/work/submission.sh"],
        5000,
      );

      // Stop leftover learner processes before inspecting side effects.
      // The lifetime process has another UID and cannot be signaled by this UID.
      await exec(bash("kill -KILL -1 2>/dev/null || true"));

      const pointsPerTest = totalPoints / testCases.length;
      const results = [];

      for (const test of testCases) {
        const check =
          script.exitCode === 0 && test.evaluationCommand !== undefined
            ? await exec(bash(test.evaluationCommand))
            : script;

        const passed =
          script.exitCode === 0 &&
          check.exitCode === 0 &&
          (
            test.expectedOutput === undefined ||
            normalizeOutput(check.stdout) ===
              normalizeOutput(test.expectedOutput)
          );

        results.push({
          id: test.id,
          title: test.title,
          passed,
          points: passed ? pointsPerTest : 0,
          maxPoints: pointsPerTest,
          actualOutput: check.stdout.slice(0, 2000),
          stderr: check.stderr.slice(0, 2000),
          exitCode: check.exitCode,
        });
      }

      const passedTests = results.filter((test) => test.passed).length;

      return {
        ok: true,
        homeworkId,
        passedTests,
        totalTests: testCases.length,
        totalPoints,
        awardedXp: passedTests * pointsPerTest,
        scriptExitCode: script.exitCode,
        scriptStderr: script.stderr.slice(0, 2000),
        results,
      };
    } finally {
      // Resolve by ownership label if create succeeded but its response was lost.
      if (!containerId) {
        const existing = await dockerAPI(
          "GET",
          `${slotPath}/json`,
          null,
          { timeoutMs: 5000 },
        );

        if (
          existing.status === 200 &&
          existing.data.Config?.Labels?.["cyberbox.job"] === jobId
        ) {
          containerId = existing.data.Id;
        }
      }

      if (containerId) {
        // Await cleanup before returning any score.
        await removeContainer(containerId);
      }
    }
  }

  const server = http.createServer(
    { requestTimeout: 10_000, headersTimeout: 5000 },
    async (req, res) => {
      function send(status, body) {
        res.writeHead(status, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(JSON.stringify(body));
      }

      if (req.method !== "POST" || req.url !== "/grade-homework") {
        send(404, { ok: false, error: "Not found." });
        return;
      }

      if (!authorized(req.headers.authorization, token)) {
        send(401, { ok: false, error: "Unauthorized." });
        return;
      }

      try {
        const result = await grade(await readJson(req));
        send(200, result);
      } catch (error) {
        if (error instanceof GradingError) {
          send(error.status, { ok: false, error: error.message });
          return;
        }

        if (
          error.code === "DOCKER_TIMEOUT" ||
          error.code === "DOCKER_OUTPUT_LIMIT"
        ) {
          send(422, {
            ok: false,
            error: "Grading exceeded its execution time or output limit.",
          });
          return;
        }

        console.error("[Homework grader]", error);
        send(500, {
          ok: false,
          error: "The grader could not finish this submission. Please retry.",
        });
      }
    },
  );

  server.listen(
    Number(process.env.GRADER_PORT ?? 3002),
    "0.0.0.0",
    () => console.log("[Homework grader] Internal endpoint ready."),
  );

  return server;
}
