// Homework runner: builds a homework's environment image, then runs a Bash
// script (the reference solution when preparing, a student's submission when
// grading) against every test case inside one sandboxed container, and
// returns what happened: stdout, stderr, exit code, duration and the files in
// the test's work folder. Comparing against expected results happens in the
// web app, so the reference solution runs once per homework version, not
// once per submission.

import { createHash } from "node:crypto";
import { dockerAPI, dockerStream, createDemuxer } from "./docker-api.mjs";
import { buildImage, imageExists, pruneImages } from "./image-builder.mjs";
import { renderMachine } from "./lab-render.mjs";
import { makeTar, readTar } from "./tar.mjs";
import { HttpError, ndjson, readJson, sendJson } from "./internal-http.mjs";

const HW_PREFIX = "cyberbox-hw-";
const MAX_TESTS = 100;
const SCRIPT_LIMIT = 64 * 1024;
const TEXT_PREVIEW = 4096;

function safe(value, length) {
  return String(value).toLowerCase().replace(/[^a-z0-9_.-]/g, "-").slice(0, length);
}

function repoPrefix(homeworkId) {
  return `${HW_PREFIX}${safe(homeworkId, 40)}:`;
}

function envTag(homeworkId, envHash) {
  return `${repoPrefix(homeworkId)}e${safe(envHash, 16)}`;
}

// ---------- environment image ----------

function environmentMachine(environment) {
  return {
    key: "env",
    hostname: "grader",
    template: environment.template,
    memoryMb: 256,
    mainUser: "student",
    packages: Array.isArray(environment.packages) ? environment.packages : [],
    users: [{ name: "student", password: "", shell: "bash", sudo: "none", sudoCommands: [], groups: [] }],
    files: Array.isArray(environment.files) ? environment.files : [],
    buildScript: environment.buildScript || "",
    startScript: "",
    services: [],
    allowPrivilegeEscalation: false,
    rawNetwork: false,
  };
}

export async function handleBuildEnvironment(req, res) {
  const { homeworkId, envHash, environment } = (await readJson(req)) ?? {};
  if (!homeworkId || !envHash || !environment || typeof environment !== "object") {
    throw new HttpError("Invalid environment build request.");
  }

  const tag = envTag(homeworkId, envHash);
  const stream = ndjson(res);

  try {
    if (await imageExists(tag)) {
      stream.log("Environment unchanged; reusing the existing image.\n");
      stream.end({ type: "result", ok: true, image: tag, cached: true });
      return;
    }

    const rendered = renderMachine(environmentMachine(environment), { mode: "none", blacklist: [], whitelist: [] });
    const result = await buildImage({
      tag,
      baseImage: rendered.baseImage,
      files: rendered.files,
      provision: rendered.provision,
      entrypoint: ["/bin/sh", "-c", "while :; do sleep 3600; done"],
      labels: { "cyberbox.kind": "homework-env", "cyberbox.homework": String(homeworkId) },
      onLog: (text) => stream.log(text),
    });

    if (!result.ok) {
      stream.end({ type: "result", ok: false, error: result.error });
      return;
    }

    await pruneImages(repoPrefix(homeworkId), [tag]);
    stream.end({ type: "result", ok: true, image: tag, cached: false });
  } catch (error) {
    console.error("[Homework env]", error);
    stream.end({ type: "result", ok: false, error: error.message || "The environment could not be built." });
  }
}

export async function handleDeleteHomework(req, res) {
  const { homeworkId } = (await readJson(req)) ?? {};
  if (!homeworkId) throw new HttpError("Missing homeworkId.");
  await pruneImages(repoPrefix(homeworkId), []);
  sendJson(res, 200, { ok: true });
}

// ---------- running tests ----------

// Runs as root inside the job container. For every test: a fresh work folder
// and /tmp, no processes left over from the previous test, the test's setup
// script (root, inside the folder), then the solution as the unprivileged
// "student" user with a time limit. Results go to /grader/out/<test>/.
export const HARNESS = `#!/bin/sh
OUT=/grader/out
WORK=/home/student/work
mkdir -p "$OUT"

centis() { read -r up _rest < /proc/uptime; echo "\${up%.*}\${up#*.}"; }

run_solution() {
  if command -v setpriv >/dev/null 2>&1; then
    setpriv --reuid=student --regid=student --init-groups -- /bin/sh /tmp/.cyberbox-run.sh
  else
    su -s /bin/sh student -c "/bin/sh /tmp/.cyberbox-run.sh"
  fi
}

kill_student() {
  if command -v setpriv >/dev/null 2>&1; then
    setpriv --reuid=student --regid=student --init-groups -- /bin/sh -c 'kill -KILL -1' >/dev/null 2>&1
  else
    su -s /bin/sh student -c 'kill -KILL -1' >/dev/null 2>&1
  fi
}

for dir in /grader/tests/*/; do
  [ -d "$dir" ] || continue
  t=$(basename "$dir")
  r="$OUT/$t"
  mkdir -p "$r"

  kill_student
  rm -rf "$WORK" /tmp/* /tmp/.[!.]* 2>/dev/null
  mkdir -p "$WORK"

  if [ -s "$dir/setup.sh" ]; then
    ( cd "$WORK" && timeout -k 2 30 bash "$dir/setup.sh" ) >"$r/setup.log" 2>&1 </dev/null
    echo $? >"$r/setup.exit"
  fi
  chown -R student "$WORK" 2>/dev/null

  cp /grader/solution.sh /tmp/.cyberbox-solution.sh
  cp "$dir/run.sh" /tmp/.cyberbox-run.sh
  chmod 0644 /tmp/.cyberbox-solution.sh /tmp/.cyberbox-run.sh

  start=$(centis)
  run_solution <"$dir/stdin" >"$r/stdout.raw" 2>"$r/stderr.raw"
  echo $? >"$r/exit"
  end=$(centis)
  echo $((end - start)) >"$r/centis"

  wc -c <"$r/stdout.raw" >"$r/stdout.bytes"
  head -c 65536 "$r/stdout.raw" >"$r/stdout"
  wc -c <"$r/stderr.raw" >"$r/stderr.bytes"
  head -c 16384 "$r/stderr.raw" >"$r/stderr"
  rm -f "$r/stdout.raw" "$r/stderr.raw"

  size=$(du -sk "$WORK" 2>/dev/null | cut -f1)
  if [ "\${size:-0}" -le 512 ]; then
    cp -a "$WORK" "$r/tree"
  else
    echo "\${size}" >"$r/tree-too-large"
  fi
done

kill_student
echo ok >"$OUT/.complete"
`;

export function runScript(limit, args) {
  return [
    "ulimit -f 20480 2>/dev/null",
    "ulimit -t 120 2>/dev/null",
    "cd /home/student/work || exit 97",
    "exec env -i HOME=/home/student USER=student LOGNAME=student SHELL=/bin/bash \\",
    "  PATH=/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin \\",
    "  LANG=C.UTF-8 LC_ALL=C.UTF-8 TERM=dumb \\",
    `  timeout -k 1 ${limit} bash /tmp/.cyberbox-solution.sh ${args}`,
    "",
  ].join("\n");
}

function validScript(value, limit) {
  return typeof value === "string" && !value.includes("\0") && Buffer.byteLength(value, "utf8") <= limit;
}

function validateRun(job) {
  const { image, script, timeLimitSec, tests } = job ?? {};
  if (typeof image !== "string" || !image.startsWith(HW_PREFIX)) throw new HttpError("Invalid environment image.");
  if (!validScript(script, SCRIPT_LIMIT) || !script.trim()) throw new HttpError("Invalid script.");
  if (!Number.isInteger(timeLimitSec) || timeLimitSec < 1 || timeLimitSec > 30) throw new HttpError("Invalid time limit.");
  if (!Array.isArray(tests) || tests.length < 1 || tests.length > MAX_TESTS) throw new HttpError("Invalid test list.");

  for (const test of tests) {
    if (!test || typeof test.id !== "string" || !test.id) throw new HttpError("Invalid test.");
    if (!validScript(test.setup ?? "", 50_000)) throw new HttpError("Invalid test setup script.");
    if (!validScript(test.stdin ?? "", 64 * 1024)) throw new HttpError("Invalid test input.");
    if (typeof (test.args ?? "") !== "string" || /[\n\r\0]/.test(test.args ?? "") || (test.args ?? "").length > 1000) {
      throw new HttpError("Invalid test arguments.");
    }
  }
}

const utf8 = new TextDecoder("utf-8", { fatal: true });

function fileInfo(rel, entry) {
  const info = { path: rel, type: entry.type, mode: entry.mode, size: entry.size };

  if (entry.type === "symlink") {
    info.target = entry.linkname;
  } else if (entry.type === "file") {
    info.sha256 = createHash("sha256").update(entry.content).digest("hex");
    if (entry.size <= TEXT_PREVIEW && !entry.content.includes(0)) {
      try {
        info.text = utf8.decode(entry.content);
      } catch {
        // binary file: hash only
      }
    }
  }

  return info;
}

export function observations(entries, manifest) {
  const result = {};

  for (const { dir, id } of manifest) {
    const prefix = `out/${dir}/`;
    const byName = new Map();
    const files = [];

    for (const entry of entries) {
      if (!entry.name.startsWith(prefix)) continue;
      const rest = entry.name.slice(prefix.length);
      if (rest.startsWith("tree/")) {
        files.push(fileInfo(rest.slice(5), entry));
      } else {
        byName.set(rest, entry);
      }
    }

    const text = (name) => byName.get(name)?.content.toString("utf8") ?? "";
    const int = (name) => {
      const value = parseInt(text(name).trim(), 10);
      return Number.isFinite(value) ? value : null;
    };

    files.sort((a, b) => a.path.localeCompare(b.path));

    result[id] = {
      ran: byName.has("exit"),
      setupExit: byName.has("setup.exit") ? int("setup.exit") : null,
      setupLog: text("setup.log").slice(0, 4000),
      exitCode: int("exit"),
      durationMs: (int("centis") ?? 0) * 10,
      stdout: text("stdout"),
      stdoutBytes: int("stdout.bytes") ?? 0,
      stderr: text("stderr"),
      stderrBytes: int("stderr.bytes") ?? 0,
      files: files.slice(0, 500),
      filesTruncated: byName.has("tree-too-large") || files.length > 500,
    };
  }

  return result;
}

async function runTests(job, onLog) {
  const { image, script, timeLimitSec, tests } = job;
  const memoryMb = Math.min(Math.max(Number(job.memoryMb) || 256, 64), 384);
  let containerId = null;

  const manifest = tests.map((test, index) => ({ id: test.id, dir: String(index + 1).padStart(3, "0") }));

  try {
    const created = await dockerAPI("POST", "/containers/create", {
      Image: image,
      Entrypoint: ["/bin/sh", "-c", "while :; do sleep 3600; done"],
      Cmd: [],
      User: "root",
      WorkingDir: "/root",
      Labels: { "cyberbox.kind": "homework-run" },
      NetworkDisabled: true,
      HostConfig: {
        NetworkMode: "none",
        Memory: memoryMb * 1024 * 1024,
        MemorySwap: memoryMb * 1024 * 1024,
        NanoCpus: 1_000_000_000,
        PidsLimit: 256,
        Init: true,
        CapDrop: ["ALL"],
        CapAdd: ["CHOWN", "DAC_OVERRIDE", "FOWNER", "SETUID", "SETGID", "KILL"],
        SecurityOpt: ["no-new-privileges:true"],
        Tmpfs: { "/tmp": "rw,nosuid,nodev,size=32m,mode=1777" },
        OomScoreAdj: 600,
        LogConfig: { Type: "none", Config: {} },
      },
    });

    if (created.status === 404) {
      throw new HttpError("The homework environment image is missing. Prepare the homework again.", 409);
    }
    if (created.status !== 201) {
      throw new Error(created.data?.message || "Could not create the grading container.");
    }
    containerId = created.data.Id;

    const started = await dockerAPI("POST", `/containers/${containerId}/start`);
    if (started.status !== 204 && started.status !== 304) {
      throw new Error(started.data?.message || "Could not start the grading container.");
    }

    const files = [
      { name: "grader", type: "5", mode: 0o700 },
      { name: "grader/harness.sh", content: HARNESS, mode: 0o700 },
      { name: "grader/solution.sh", content: script, mode: 0o644 },
      { name: "grader/tests", type: "5", mode: 0o700 },
    ];
    tests.forEach((test, index) => {
      const dir = `grader/tests/${manifest[index].dir}`;
      files.push({ name: dir, type: "5", mode: 0o700 });
      files.push({ name: `${dir}/setup.sh`, content: test.setup ?? "", mode: 0o700 });
      files.push({ name: `${dir}/stdin`, content: test.stdin ?? "", mode: 0o600 });
      files.push({ name: `${dir}/run.sh`, content: runScript(timeLimitSec, test.args ?? ""), mode: 0o644 });
    });

    const upload = await dockerAPI("PUT", `/containers/${containerId}/archive?path=/`, makeTar(files));
    if (upload.status !== 200) {
      throw new Error(upload.data?.message || "Could not copy the test files.");
    }

    const exec = await dockerAPI("POST", `/containers/${containerId}/exec`, {
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
      User: "root",
      WorkingDir: "/root",
      Env: ["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin", "LANG=C.UTF-8"],
      Cmd: ["/bin/sh", "/grader/harness.sh"],
    });
    if (exec.status !== 201) {
      throw new Error(exec.data?.message || "Could not start the grader.");
    }

    let harnessLog = "";
    const demux = createDemuxer((_stream, payload) => {
      if (harnessLog.length < 20_000) harnessLog += payload.toString("utf8");
    });

    onLog(`Running ${tests.length} test${tests.length === 1 ? "" : "s"}…\n`);
    const budgetMs = tests.length * (timeLimitSec + 40) * 1000 + 60_000;

    await dockerStream(
      "POST",
      `/exec/${exec.data.Id}/start`,
      { Detach: false, Tty: false },
      (chunk) => demux(chunk),
      { timeoutMs: budgetMs },
    );

    const archive = await dockerAPI("GET", `/containers/${containerId}/archive?path=/grader/out`, null, {
      raw: true,
      timeoutMs: 120_000,
      maxBytes: 40 * 1024 * 1024,
    });

    if (archive.status !== 200) {
      throw new Error("The grader produced no results." + (harnessLog ? ` ${harnessLog.slice(0, 500)}` : ""));
    }

    const entries = readTar(archive.data);
    if (!entries.some((entry) => entry.name === "out/.complete")) {
      throw new Error("The grader stopped before finishing every test (the container may have run out of memory).");
    }

    return observations(entries, manifest);
  } finally {
    if (containerId) {
      await dockerAPI("DELETE", `/containers/${containerId}?force=1&v=1`).catch(() => {});
    }
  }
}

// Grading jobs run one at a time.
let runChain = Promise.resolve();

export async function handleRun(req, res) {
  const job = await readJson(req);
  validateRun(job);

  const stream = ndjson(res);
  const run = runChain.then(() => runTests(job, (text) => stream.log(text)));
  runChain = run.catch(() => {});

  try {
    const result = await run;
    stream.end({ type: "result", ok: true, observations: result });
  } catch (error) {
    if (!(error instanceof HttpError)) console.error("[Homework run]", error);
    stream.end({ type: "result", ok: false, error: error.message || "Grading could not finish." });
  }
}
