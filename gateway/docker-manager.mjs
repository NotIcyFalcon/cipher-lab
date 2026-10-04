// On-demand Docker container manager for lab environments.
// Uses the Docker Engine API over the Unix socket to start/stop
// containers that were defined in compose.yaml with profiles.

// homework-grader.mjs starts its internal HTTP endpoint when imported.
// It does not export a starter function; importing a missing named export
// made Node refuse to load the gateway at all.
import "./homework-grader.mjs";
import http from "node:http";
import {
  dockerSocketPath,
  composeProject,
  maxRunningLabs,
  labs,
} from "./config.mjs";

const DEFAULT_SERVICE = "linux-basics";
const IDLE_TIMEOUT_MS = 15 * 60_000;

// Only compose services declared in config.mjs may be started or stopped.
// Without this, a lab whose runtime_service named "web" or "proxy" would let
// the gateway stop core containers when enforcing the lab limit.
const allowedServices = new Set(
  [...labs.values()].map((lab) => lab.service),
);

// Track running lab containers by compose service:
// service -> { containerId, containerName, host, startedAt, lastUsed }
// Several lab IDs can share one service, so the limit counts containers.
const runningLabs = new Map();
const startingLabs = new Map();

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
async function enforceLimit(excludeService) {
  while (runningLabs.size >= maxRunningLabs) {
    let oldestService = null;
    let oldestTime = Infinity;

    for (const [service, info] of runningLabs) {
      if (service === excludeService) continue;
      if (info.lastUsed < oldestTime) {
        oldestTime = info.lastUsed;
        oldestService = service;
      }
    }

    if (!oldestService) break;

    const old = runningLabs.get(oldestService);
    runningLabs.delete(oldestService);
    await stopContainer(old.containerId, old.containerName);
  }
}

// Ask the web app which compose service runs this lab.
async function resolveService(labId) {
  const token = process.env.GRADER_INTERNAL_TOKEN;
  const origin = process.env.WEB_INTERNAL_ORIGIN || "http://web:3000";

  if (!token) return DEFAULT_SERVICE;

  try {
    const res = await fetch(
      `${origin}/api/internal/lab-service?labId=${encodeURIComponent(labId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5_000),
      },
    );

    if (res.status === 404) {
      throw Object.assign(new Error("Unknown lab."), { code: "UNKNOWN_LAB" });
    }

    if (!res.ok) {
      console.error(`[Docker] Lab service lookup failed: HTTP ${res.status}`);
      return DEFAULT_SERVICE;
    }

    const data = await res.json();
    const service = typeof data.service === "string" ? data.service : "";

    if (allowedServices.has(service)) return service;

    if (service) {
      console.error(
        `[Docker] Lab "${labId}" requested undeclared service "${service}". Using ${DEFAULT_SERVICE}.`,
      );
    }
  } catch (error) {
    if (error.code === "UNKNOWN_LAB") throw error;
    console.error("[Docker] Failed to query lab service mapping:", error.message);
  }

  return DEFAULT_SERVICE;
}

async function ensureServiceRunning(service) {
  const tracked = runningLabs.get(service);

  if (tracked) {
    tracked.lastUsed = Date.now();

    // Quick check that it's actually still running
    try {
      const inspectRes = await dockerAPI("GET", `/containers/${tracked.containerId}/json`);
      if (inspectRes.status === 200 && inspectRes.data.State?.Running) {
        return tracked.host;
      }
    } catch {
      // Container gone, fall through to restart
    }

    runningLabs.delete(service);
  }

  // Enforce the container limit before starting a new one
  await enforceLimit(service);

  const result = await startContainer(service);

  runningLabs.set(service, {
    containerId: result.containerId,
    containerName: result.containerName,
    host: result.host,
    startedAt: Date.now(),
    lastUsed: Date.now(),
  });

  return result.host;
}

// Public API: ensure a lab is running and return its SSH host and service
export async function ensureLabRunning(labId) {
  const service = await resolveService(labId);

  // Concurrent connections to the same service share one start attempt.
  let pending = startingLabs.get(service);

  if (!pending) {
    pending = ensureServiceRunning(service).finally(() => {
      startingLabs.delete(service);
    });
    startingLabs.set(service, pending);
  }

  return { host: await pending, service };
}

// Auto-shutdown: stop labs that haven't been used in 15 minutes
setInterval(async () => {
  const now = Date.now();

  for (const [service, info] of runningLabs) {
    if (now - info.lastUsed > IDLE_TIMEOUT_MS) {
      console.log(`[Docker] Auto-stopping idle lab "${service}"`);
      runningLabs.delete(service);
      await stopContainer(info.containerId, info.containerName);
    }
  }
}, 60_000);

// Mark a lab as recently used (called when terminal input arrives)
export function touchLab(service) {
  const info = runningLabs.get(service);
  if (info) info.lastUsed = Date.now();
}
