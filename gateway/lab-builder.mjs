import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { dockerAPI } from "./docker-api.mjs";
import { makeTar } from "./tar.mjs";
import { renderMachine } from "./lab-render.mjs";

const BODY_LIMIT = 4 * 1024 * 1024;
const LOG_LIMIT = 200 * 1024;
const BUILD_MS = 15 * 60_000;

export const LAB_IMAGE_PREFIX = "cyberbox-lab";

export function imageTag(labId, machineKey, buildId) {
  // Docker tags must be lowercase and limited to [a-z0-9_.-].
  const safeLab = String(labId).toLowerCase().replace(/[^a-z0-9_.-]/g, "-").slice(0, 40);
  const safeMachine = String(machineKey).toLowerCase().replace(/[^a-z0-9_.-]/g, "-").slice(0, 24);
  return `${LAB_IMAGE_PREFIX}-${safeLab}-${safeMachine}:b${buildId}`;
}

class BuildError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function authorized(header, token) {
  const actual = Buffer.from(typeof header === "string" ? header : "");
  const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new BuildError("Recipe too large.", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new BuildError("Invalid JSON.", 400);
  }
}

// Parse Docker's chunked JSON build stream into readable log text.
function appendBuildStream(state, buffer) {
  state.carry += buffer.toString("utf8");
  const parts = state.carry.split("\n");
  state.carry = parts.pop() ?? "";

  for (const line of parts) {
    if (!line.trim()) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (typeof msg.stream === "string") state.log += msg.stream;
    if (typeof msg.status === "string") state.log += msg.status + "\n";
    if (msg.errorDetail?.message || msg.error) {
      state.error = msg.errorDetail?.message || msg.error;
    }
    if (state.log.length > LOG_LIMIT) {
      state.log = state.log.slice(-LOG_LIMIT);
    }
  }
}

async function buildImage(tag, context) {
  const tar = makeTar(context);
  const state = { log: "", carry: "", error: null };

  const res = await dockerAPI(
    "POST",
    `/build?t=${encodeURIComponent(tag)}&forcerm=1&rm=1&networkmode=bridge`,
    tar,
    { raw: true, timeoutMs: BUILD_MS, maxBytes: 48 * 1024 * 1024 },
  );

  appendBuildStream(state, res.data);

  if (res.status !== 200) {
    throw new BuildError(`Docker build failed (HTTP ${res.status}).`, 500);
  }

  return state;
}

// Remove images from earlier builds of this lab, keeping the one just built.
async function pruneOldImages(labId, keepTag) {
  const prefix = imageTag(labId, "", 0).split(":")[0].replace(/-$/, "");
  try {
    const res = await dockerAPI("GET", "/images/json?all=0");
    if (res.status !== 200 || !Array.isArray(res.data)) return;
    for (const image of res.data) {
      for (const tag of image.RepoTags || []) {
        if (tag.startsWith(prefix) && tag !== keepTag && !tag.endsWith(":<none>")) {
          await dockerAPI("DELETE", `/images/${encodeURIComponent(tag)}?force=1`, null, {
            statuses: [200, 404, 409],
          }).catch(() => {});
        }
      }
    }
  } catch {
    // Pruning is best-effort; a leftover image never blocks a build.
  }
}

async function buildLab(job) {
  const { labId, buildId, recipe } = job;

  if (!labId || !buildId || !recipe || !Array.isArray(recipe.machines)) {
    throw new BuildError("Invalid build job.");
  }

  const images = {};
  let log = "";

  for (const machine of recipe.machines) {
    const tag = imageTag(labId, machine.key, buildId);
    log += `\n=== Building machine "${machine.hostname}" (${tag}) ===\n`;

    let rendered;
    try {
      rendered = renderMachine(machine, recipe.policy);
    } catch (error) {
      throw new BuildError(`Could not prepare "${machine.hostname}": ${error.message}`);
    }

    const result = await buildImage(tag, rendered.context);
    log += result.log;

    if (result.error) {
      return { ok: false, error: `Build failed for "${machine.hostname}": ${result.error}`, log, images: {} };
    }

    images[machine.key] = tag;
  }

  for (const machine of recipe.machines) {
    await pruneOldImages(labId, images[machine.key]);
  }

  return { ok: true, images, log };
}

export function createLabBuilder(token) {
  const server = http.createServer(
    { requestTimeout: BUILD_MS + 5_000 },
    async (req, res) => {
      const send = (status, body) => {
        res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        res.end(JSON.stringify(body));
      };

      if (req.method !== "POST" || req.url !== "/build-lab") {
        return send(404, { ok: false, error: "Not found." });
      }
      if (!authorized(req.headers.authorization, token)) {
        return send(401, { ok: false, error: "Unauthorized." });
      }

      try {
        const result = await buildLab(await readJson(req));
        send(200, result);
      } catch (error) {
        if (error instanceof BuildError) {
          return send(error.status, { ok: false, error: error.message });
        }
        console.error("[Lab builder]", error);
        send(500, { ok: false, error: "The lab could not be built. Please try again." });
      }
    },
  );

  const port = Number(process.env.LAB_BUILDER_PORT ?? 3003);
  server.listen(port, "0.0.0.0", () => console.log(`[Lab builder] Internal endpoint ready on ${port}.`));
  return server;
}

if (process.env.NODE_ENV !== "test") {
  createLabBuilder(process.env.GRADER_INTERNAL_TOKEN || process.env.GRADER_TOKEN || "test-token");
}
