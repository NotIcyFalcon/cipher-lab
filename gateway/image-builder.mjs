// Builds images without `docker build`: start a container from the base
// image, copy the generated /cyberbox scripts in, run the provision script
// (root, internet access) while streaming its output, then commit the
// container as the new image. This works the same on every Docker version and
// storage backend, and gives a clean, live build log.

import { dockerAPI, dockerStream, createDemuxer } from "./docker-api.mjs";
import { makeTar } from "./tar.mjs";

const PULL_MS = 15 * 60_000;
const PROVISION_MS = 20 * 60_000;

function splitImage(ref) {
  const slash = ref.lastIndexOf("/");
  const colon = ref.lastIndexOf(":");
  if (colon > slash) return { repo: ref.slice(0, colon), tag: ref.slice(colon + 1) };
  return { repo: ref, tag: "latest" };
}

function dockerMessage(res, fallback) {
  const message = res?.data?.message;
  return typeof message === "string" && message ? message : fallback;
}

export async function imageExists(ref) {
  const res = await dockerAPI("GET", `/images/${encodeURIComponent(ref)}/json`);
  return res.status === 200;
}

async function pullImage(ref, onLog) {
  const { repo, tag } = splitImage(ref);
  const seen = new Map();
  let carry = "";
  let error = null;

  onLog(`Pulling base image ${ref}…\n`);

  const res = await dockerStream(
    "POST",
    `/images/create?fromImage=${encodeURIComponent(repo)}&tag=${encodeURIComponent(tag)}`,
    null,
    (chunk) => {
      carry += chunk.toString("utf8");
      const lines = carry.split("\n");
      carry = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (msg.error || msg.errorDetail?.message) {
          error = msg.errorDetail?.message || msg.error;
          continue;
        }
        // Log each layer's status changes, skipping progress-bar noise.
        const status = String(msg.status || "");
        if (!status || /Downloading|Extracting|Waiting|Verifying/.test(status)) continue;
        const key = msg.id || status;
        if (seen.get(key) === status) continue;
        seen.set(key, status);
        onLog(`${msg.id ? msg.id + ": " : ""}${status}\n`);
      }
    },
    { timeoutMs: PULL_MS },
  );

  if (res.status !== 200 || error) {
    throw new Error(`Could not pull ${ref}: ${error || `HTTP ${res.status}`}`);
  }
}

async function runExec(containerId, cmd, onLog, timeoutMs) {
  const created = await dockerAPI("POST", `/containers/${containerId}/exec`, {
    AttachStdout: true,
    AttachStderr: true,
    Tty: false,
    User: "root",
    WorkingDir: "/root",
    Env: ["DEBIAN_FRONTEND=noninteractive", "LANG=C.UTF-8"],
    Cmd: cmd,
  });

  if (created.status !== 201) {
    throw new Error(dockerMessage(created, "Could not start the provision step."));
  }

  const execId = created.data.Id;
  const demux = createDemuxer((_stream, payload) => onLog(payload.toString("utf8")));

  await dockerStream(
    "POST",
    `/exec/${execId}/start`,
    { Detach: false, Tty: false },
    (chunk) => demux(chunk),
    { timeoutMs },
  );

  const inspect = await dockerAPI("GET", `/exec/${execId}/json`);
  return inspect.data?.ExitCode ?? 1;
}

// One build at a time across labs and homework environments, so two builds
// never compete for memory on a small host. Later callers wait their turn.
let buildChain = Promise.resolve();

export function buildImage(options) {
  const run = buildChain.then(() => buildImageNow(options));
  buildChain = run.catch(() => {});
  return run;
}

/**
 * Build an image.
 *   tag        e.g. "cyberbox-lab-<id>-box:b12"
 *   baseImage  e.g. "debian:bookworm-slim"
 *   files      tar entries placed at the container root, e.g. "cyberbox/provision.sh"
 *   provision  command to run, e.g. ["/bin/sh", "/cyberbox/provision.sh"]
 *   entrypoint the committed image's ENTRYPOINT (exec form array)
 *   labels     image labels
 *   onLog      receives build output text
 */
async function buildImageNow({
  tag,
  baseImage,
  files,
  provision,
  entrypoint,
  labels = {},
  onLog = () => {},
  memoryMb = 512,
}) {
  let containerId = null;

  try {
    if (!(await imageExists(baseImage))) {
      await pullImage(baseImage, onLog);
    }

    const created = await dockerAPI("POST", "/containers/create", {
      Image: baseImage,
      Entrypoint: ["/bin/sh", "-c", "while :; do sleep 3600; done"],
      Cmd: [],
      WorkingDir: "/root",
      Labels: { "cyberbox.kind": "image-build" },
      HostConfig: {
        Memory: memoryMb * 1024 * 1024,
        MemorySwap: memoryMb * 2 * 1024 * 1024,
        NanoCpus: 1_000_000_000,
        PidsLimit: 512,
        Init: true,
        NetworkMode: "bridge", // internet is available while building
        LogConfig: { Type: "none", Config: {} },
      },
    });

    if (created.status !== 201) {
      throw new Error(dockerMessage(created, "Could not create the build container."));
    }
    containerId = created.data.Id;

    const started = await dockerAPI("POST", `/containers/${containerId}/start`);
    if (started.status !== 204 && started.status !== 304) {
      throw new Error(dockerMessage(started, "Could not start the build container."));
    }

    const upload = await dockerAPI("PUT", `/containers/${containerId}/archive?path=/`, makeTar(files));
    if (upload.status !== 200) {
      throw new Error(dockerMessage(upload, "Could not copy the build files."));
    }

    onLog("Running provision script…\n");
    const exitCode = await runExec(containerId, provision, onLog, PROVISION_MS);

    if (exitCode !== 0) {
      return { ok: false, error: `The provision script failed (exit code ${exitCode}). See the log above.` };
    }

    const { repo, tag: imageTag } = splitImage(tag);
    const changes = [
      `ENTRYPOINT ${JSON.stringify(entrypoint)}`,
      "WORKDIR /root",
      ...Object.entries({ ...labels, "cyberbox.managed": "1" }).map(
        ([key, value]) => `LABEL ${key}=${JSON.stringify(String(value))}`,
      ),
    ];
    const query = [
      `container=${encodeURIComponent(containerId)}`,
      `repo=${encodeURIComponent(repo)}`,
      `tag=${encodeURIComponent(imageTag)}`,
      "pause=true",
      ...changes.map((change) => `changes=${encodeURIComponent(change)}`),
    ].join("&");

    const committed = await dockerAPI("POST", `/commit?${query}`, null, { timeoutMs: 10 * 60_000 });
    if (committed.status !== 201) {
      throw new Error(dockerMessage(committed, "Could not save the built image."));
    }

    onLog(`Saved image ${tag}\n`);
    return { ok: true };
  } finally {
    if (containerId) {
      await dockerAPI("DELETE", `/containers/${containerId}?force=1&v=1`).catch(() => {});
    }
  }
}

/** Remove images whose repository starts with `repoPrefix`, keeping `keep` tags. */
export async function pruneImages(repoPrefix, keep = []) {
  const keepSet = new Set(keep);
  try {
    const res = await dockerAPI("GET", "/images/json");
    if (res.status !== 200 || !Array.isArray(res.data)) return;

    for (const image of res.data) {
      for (const ref of image.RepoTags || []) {
        if (!ref.startsWith(repoPrefix) || keepSet.has(ref)) continue;
        await dockerAPI("DELETE", `/images/${encodeURIComponent(ref)}?force=1`).catch(() => {});
      }
    }

    // Layers left behind by deleted tags (only images this app built).
    const filters = encodeURIComponent(
      JSON.stringify({ dangling: ["true"], label: ["cyberbox.managed=1"] }),
    );
    await dockerAPI("POST", `/images/prune?filters=${filters}`).catch(() => {});
  } catch {
    // Pruning is best effort.
  }
}
