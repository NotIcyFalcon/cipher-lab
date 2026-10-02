// On-demand Docker container manager for lab environments.
// Uses the Docker Engine API over the Unix socket to start/stop
// containers that were defined in compose.yaml with profiles.

import { startHomeworkGrader } from "./homework-grader.mjs";
import http from "node:http";
import {
  dockerSocketPath,
  composeProject,
  maxRunningLabs,
  labs,
} from "./config.mjs";

// Track running labs: labId -> { containerId, containerName, startedAt, lastUsed }
const runningLabs = new Map();

// Make a request to the Docker Engine API via Unix socket
function dockerAPI(method, path, body = null, options = {}) {
  const {
    raw = false,
    timeoutMs = 30_000,
    maxBytes = 2 * 1024 * 1024,
  } = options;

  return new Promise((resolve, reject) => {
    let timer;

    function fail(error) {
      clearTimeout(timer);
      reject(error);
    }

    const req = http.request(
      {
        socketPath: dockerSocketPath,
        path: `/v${process.env.DOCKER_API_VERSION ?? "1.44"}${path}`,
        method,
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        const chunks = [];
        let bytes = 0;

        res.on("error", fail);
        res.on("aborted", () => {
          fail(new Error("Docker response was interrupted."));
        });

        res.on("data", (chunk) => {
          bytes += chunk.length;

          if (bytes > maxBytes) {
            const error = Object.assign(
              new Error("Docker response exceeded its output limit."),
              { code: "DOCKER_OUTPUT_LIMIT" },
            );

            fail(error);
            req.destroy();
            return;
          }

          chunks.push(chunk);
        });

        res.on("end", () => {
          clearTimeout(timer);

          const buffer = Buffer.concat(chunks);
          let data = raw ? buffer : null;

          if (!raw && buffer.length) {
            const text = buffer.toString("utf8");

            try {
              data = JSON.parse(text);
            } catch {
              data = text;
            }
          }

          resolve({ status: res.statusCode, data });
        });
      },
    );

    req.on("error", fail);

    timer = setTimeout(() => {
      const error = Object.assign(
        new Error("Docker request exceeded its deadline."),
        { code: "DOCKER_TIMEOUT" },
      );

      fail(error);
      req.destroy();
    }, timeoutMs);

    req.end(body === null ? undefined : JSON.stringify(body));
  });
}

// Find the container for a lab service by its compose labels
async function findContainer(serviceName) {
  const filters = JSON.stringify({
    label: [
      `com.docker.compose.project=${composeProject}`,
      `com.docker.compose.service=${serviceName}`,
    ],
  });

  const res = await dockerAPI(
    "GET",
    `/containers/json?all=true&filters=${encodeURIComponent(filters)}`,
  );

  if (res.status !== 200 || !Array.isArray(res.data) || res.data.length === 0) {
    return null;
  }

  return res.data[0];
}

// Get the IP address of a container on the practice network
function getContainerIP(container) {
  const networks = container.NetworkSettings?.Networks || {};
  // Look for the practice network
  for (const [name, net] of Object.entries(networks)) {
    if (name.includes("practice") && net.IPAddress) {
      return net.IPAddress;
    }
  }
  // Fallback: use any available IP
  for (const net of Object.values(networks)) {
    if (net.IPAddress) return net.IPAddress;
  }
  return null;
}

// Start a container if it's not already running
async function startContainer(serviceName) {
  const container = await findContainer(serviceName);

  if (!container) {
    throw new Error(`Container for service "${serviceName}" not found. Run: docker compose create ${serviceName}`);
  }

  const state = container.State;
  const id = container.Id;

  if (state === "running") {
    // Already running, just get its IP
    // Refresh container info to get network details
    const inspectRes = await dockerAPI("GET", `/containers/${id}/json`);
    if (inspectRes.status !== 200) {
      throw new Error("Could not inspect running container.");
    }
    return {
      containerId: id,
      containerName: container.Names?.[0]?.replace(/^\//, "") || serviceName,
      host: getContainerIP(inspectRes.data) || serviceName,
    };
  }

  // Start the container
  console.log(`[Docker] Starting container for "${serviceName}" (${id.slice(0, 12)})`);
  const startRes = await dockerAPI("POST", `/containers/${id}/start`);

  if (startRes.status !== 204 && startRes.status !== 304) {
    throw new Error(`Failed to start container: HTTP ${startRes.status}`);
  }

  // Wait for the container to be healthy (SSH ready), polling every 500ms up to 15s
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));

    const inspectRes = await dockerAPI("GET", `/containers/${id}/json`);
    if (inspectRes.status !== 200) continue;

    const health = inspectRes.data.State?.Health?.Status;
    const running = inspectRes.data.State?.Running;

    if (!running) throw new Error("Container exited unexpectedly.");

    // If healthy or if there's no healthcheck defined, proceed
    if (health === "healthy" || (!health && running)) {
      const ip = getContainerIP(inspectRes.data);
      if (ip) {
        console.log(`[Docker] Container "${serviceName}" ready at ${ip}`);
        return {
          containerId: id,
          containerName: container.Names?.[0]?.replace(/^\//, "") || serviceName,
          host: ip,
        };
      }
    }
  }

  throw new Error("Container did not become healthy in time.");
}

// Stop a container
async function stopContainer(containerId, serviceName) {
  console.log(`[Docker] Stopping container "${serviceName}" (${containerId.slice(0, 12)})`);
  try {
    await dockerAPI("POST", `/containers/${containerId}/stop?t=5`);
  } catch (err) {
    console.error(`[Docker] Error stopping ${serviceName}:`, err.message);
  }
}

// Enforce the max running labs limit. Stops the least-recently-used lab.
async function enforceLimit(excludeLabId) {
  while (runningLabs.size >= maxRunningLabs) {
    // Find the oldest (least recently used) lab that isn't the one we're starting
    let oldestId = null;
    let oldestTime = Infinity;

    for (const [labId, info] of runningLabs) {
      if (labId === excludeLabId) continue;
      if (info.lastUsed < oldestTime) {
        oldestTime = info.lastUsed;
        oldestId = labId;
      }
    }

    if (!oldestId) break;

    const old = runningLabs.get(oldestId);
    runningLabs.delete(oldestId);
    await stopContainer(old.containerId, old.containerName);
  }
}

// Public API: ensure a lab is running and return its SSH host
export async function ensureLabRunning(labId) {
  const labDef = labs.get(labId) || { service: "linux-basics" };

  // If we already track it as running, refresh lastUsed and verify
  if (runningLabs.has(labId)) {
    const info = runningLabs.get(labId);
    info.lastUsed = Date.now();

    // Quick check that it's actually still running
    try {
      const inspectRes = await dockerAPI("GET", `/containers/${info.containerId}/json`);
      if (inspectRes.status === 200 && inspectRes.data.State?.Running) {
        return info.host;
      }
    } catch {
      // Container gone, fall through to restart
    }

    runningLabs.delete(labId);
  }

  // Enforce the 3-container limit before starting a new one
  await enforceLimit(labId);

  // Start the container
  const result = await startContainer(labDef.service);

  runningLabs.set(labId, {
    containerId: result.containerId,
    containerName: result.containerName,
    host: result.host,
    startedAt: Date.now(),
    lastUsed: Date.now(),
  });

  return result.host;
}

// Auto-shutdown: stop labs that haven't been used in 15 minutes
setInterval(async () => {
  const now = Date.now();
  const idleTimeout = 15 * 60_000;

  for (const [labId, info] of runningLabs) {
    if (now - info.lastUsed > idleTimeout) {
      console.log(`[Docker] Auto-stopping idle lab "${labId}"`);
      runningLabs.delete(labId);
      await stopContainer(info.containerId, info.containerName);
    }
  }
}, 60_000);

// Mark a lab as recently used (called when terminal input arrives)
export function touchLab(labId) {
  const info = runningLabs.get(labId);
  if (info) info.lastUsed = Date.now();
}

startHomeworkGrader(dockerAPI, composeProject);
