// On-demand lab sessions. Each session creates fresh containers (one per
// machine in the lab's recipe) on a private per-session network, built from
// the images produced by lab-builder. The learner's terminal attaches to the
// entry machine with `docker exec`. Containers are removed when the session
// ends or goes idle.

import { randomUUID } from "node:crypto";
import { dockerAPI, dockerExecStart } from "./docker-api.mjs";
import { maxRunningLabs } from "./config.mjs";

// These self-start their internal HTTP endpoints when imported.
import "./homework-grader.mjs";
import "./lab-builder.mjs";

const IDLE_TIMEOUT_MS = 15 * 60_000;
const MEMORY_BUDGET_MB = Number(process.env.LAB_MEMORY_BUDGET_MB || "384");
const WEB_ORIGIN = process.env.WEB_INTERNAL_ORIGIN || "http://web:3000";

// sessionId -> { labId, createdAt, lastUsed, memoryMb, network, entry, containers:[{id,machineKey,hostname}] }
const sessions = new Map();
const starting = new Map();

async function fetchRuntime(labId) {
  const token = process.env.GRADER_INTERNAL_TOKEN;
  const res = await fetch(`${WEB_ORIGIN}/api/internal/lab-runtime?labId=${encodeURIComponent(labId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8_000),
  });

  if (res.status === 404) {
    throw Object.assign(new Error("Unknown lab."), { code: "UNKNOWN_LAB" });
  }
  if (res.status === 409) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || "This lab is not built yet."), { code: "NOT_READY" });
  }
  if (!res.ok) {
    throw new Error(`Lab runtime lookup failed: HTTP ${res.status}`);
  }

  const spec = await res.json();
  if (!spec || !Array.isArray(spec.machines) || spec.machines.length === 0) {
    throw Object.assign(new Error("This lab is not built yet."), { code: "NOT_READY" });
  }
  return spec;
}

function sessionMemory(spec) {
  return spec.machines.reduce((sum, m) => sum + (Number(m.memoryMb) || 128), 0);
}

function runningMemory() {
  let total = 0;
  for (const s of sessions.values()) total += s.memoryMb;
  return total;
}

async function removeSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  sessions.delete(sessionId);

  for (const container of session.containers) {
    await dockerAPI("DELETE", `/containers/${container.id}?v=1&force=1`, null, {
      statuses: [200, 204, 404, 409],
    }).catch(() => {});
  }
  if (session.network) {
    await dockerAPI("DELETE", `/networks/${session.network}`, null, {
      statuses: [200, 204, 404],
    }).catch(() => {});
  }
}

// Make room for a new session: at most maxRunningLabs sessions, and the sum of
// their memory within the budget. Oldest idle sessions are removed first.
async function enforceLimits(incomingMemory) {
  const ordered = () => [...sessions.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);

  while (sessions.size >= maxRunningLabs) {
    const victim = ordered()[0];
    if (!victim) break;
    await removeSession(victim[0]);
  }
  while (sessions.size > 0 && runningMemory() + incomingMemory > MEMORY_BUDGET_MB) {
    const victim = ordered()[0];
    if (!victim) break;
    await removeSession(victim[0]);
  }
}

function hostConfigFor(machine) {
  const caps = [];
  const securityOpt = [];

  if (machine.allowPrivilegeEscalation) {
    // sudo and SUID binaries must work for privilege-escalation labs.
    caps.push("CHOWN", "DAC_OVERRIDE", "FOWNER", "SETGID", "SETUID", "SETPCAP", "KILL");
  } else {
    securityOpt.push("no-new-privileges:true");
    caps.push("CHOWN", "DAC_OVERRIDE", "FOWNER", "SETGID", "SETUID", "KILL");
  }
  if (machine.rawNetwork) {
    caps.push("NET_RAW", "NET_ADMIN");
  }

  const memBytes = (Number(machine.memoryMb) || 128) * 1024 * 1024;

  return {
    Memory: memBytes,
    MemorySwap: memBytes, // no swap
    NanoCpus: 500_000_000, // 0.5 CPU
    PidsLimit: 192,
    // Under memory pressure the kernel kills lab containers before the web,
    // gateway or proxy (which carry negative oom_score_adj in compose).
    OomScoreAdj: 600,
    CapDrop: ["ALL"],
    CapAdd: caps,
    SecurityOpt: securityOpt,
    Init: true,
    AutoRemove: true,
    RestartPolicy: { Name: "no" },
    Tmpfs: { "/run": "rw,nosuid,nodev,size=16m" },
    LogConfig: { Type: "json-file", Config: { "max-size": "1m", "max-file": "1" } },
  };
}

async function waitRunning(containerId, deadlineMs = 10_000) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    const res = await dockerAPI("GET", `/containers/${containerId}/json`, null, { statuses: [200, 404] });
    if (res.status === 200 && res.data.State?.Running) return true;
    if (res.status === 200 && res.data.State?.Status === "exited") {
      throw new Error("A lab machine exited immediately after starting.");
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("A lab machine did not start in time.");
}

async function createSession(labId, spec) {
  const sessionId = randomUUID().slice(0, 12);
  const networkName = `cyberbox-sess-${sessionId}`;
  const memoryMb = sessionMemory(spec);

  await enforceLimits(memoryMb);

  const net = await dockerAPI("POST", "/networks/create", {
    Name: networkName,
    Driver: "bridge",
    Internal: true, // no internet inside a running lab
    EnableIPv6: false,
    Labels: { "cyberbox.kind": "lab-session", "cyberbox.session": sessionId },
  }, { statuses: [201] });

  const session = {
    labId,
    createdAt: Date.now(),
    lastUsed: Date.now(),
    memoryMb,
    network: net.data.Id,
    entry: null,
    containers: [],
  };
  sessions.set(sessionId, session);

  try {
    for (const machine of spec.machines) {
      const name = `cyberbox-lab-${sessionId}-${machine.hostname}`;
      const created = await dockerAPI(
        "POST",
        `/containers/create?name=${encodeURIComponent(name)}`,
        {
          Image: machine.image,
          Hostname: machine.hostname,
          Labels: { "cyberbox.kind": "lab", "cyberbox.session": sessionId },
          HostConfig: { ...hostConfigFor(machine), NetworkMode: networkName },
          NetworkingConfig: {
            EndpointsConfig: { [networkName]: { Aliases: [machine.hostname] } },
          },
        },
        { statuses: [201, 404] },
      );

      if (created.status === 404) {
        throw Object.assign(new Error("This lab needs to be rebuilt."), { code: "NOT_READY" });
      }

      const containerId = created.data.Id;
      session.containers.push({ id: containerId, machineKey: machine.key, hostname: machine.hostname });

      await dockerAPI("POST", `/containers/${containerId}/start`, null, { statuses: [204, 304] });
      await waitRunning(containerId);

      if (machine.key === spec.entryMachine) {
        session.entry = {
          containerId,
          user: machine.mainUser || spec.entryUser || "root",
          policyMode: spec.policyMode || "none",
        };
      }
    }

    if (!session.entry) throw new Error("The lab has no entry machine.");
    return { sessionId, session };
  } catch (error) {
    await removeSession(sessionId);
    throw error;
  }
}

// Public API: open (or reuse) a lab session and return what the terminal needs.
export async function openLabSession(labId) {
  const spec = await fetchRuntime(labId);

  // One in-flight start per lab avoids double-provisioning on rapid reconnects.
  let pending = starting.get(labId);
  if (!pending) {
    pending = createSession(labId, spec).finally(() => starting.delete(labId));
    starting.set(labId, pending);
  }

  const { sessionId, session } = await pending;
  session.lastUsed = Date.now();

  return {
    sessionId,
    containerId: session.entry.containerId,
    user: session.entry.user,
    policyMode: session.entry.policyMode,
  };
}

export function touchSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) session.lastUsed = Date.now();
}

export async function closeSession(sessionId) {
  await removeSession(sessionId);
}

// Decide how the interactive shell is launched, given the command policy.
function shellCommand(policyMode) {
  switch (policyMode) {
    case "whitelist":
      // PATH limited to the allowed-commands directory, plus an allow-list
      // guard in the rcfile. cd and redirection still work.
      return {
        Cmd: ["/bin/bash", "--rcfile", "/cyberbox/guard.bash", "-i"],
        Env: ["PATH=/cyberbox/allowed", "TERM=xterm-256color"],
      };
    case "blacklist":
      return { Cmd: ["/bin/bash", "--rcfile", "/cyberbox/guard.bash", "-i"], Env: ["TERM=xterm-256color"] };
    default:
      return { Cmd: ["/bin/bash", "-l", "-i"], Env: ["TERM=xterm-256color"] };
  }
}

// Open an interactive shell on the entry container; returns the raw duplex
// socket plus a resize().
export async function execShell({ containerId, user, policyMode, cols, rows }) {
  const shell = shellCommand(policyMode);

  const create = await dockerAPI(
    "POST",
    `/containers/${containerId}/exec`,
    {
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      User: user || "root",
      Env: shell.Env,
      WorkingDir: user && user !== "root" ? `/home/${user}` : "/root",
      Cmd: shell.Cmd,
    },
    { statuses: [201, 404] },
  );

  if (create.status === 404) throw new Error("The lab session has ended.");
  const execId = create.data.Id;

  await dockerAPI("POST", `/exec/${execId}/resize?h=${rows}&w=${cols}`, null, {
    statuses: [200, 201, 400, 404, 409],
  }).catch(() => {});

  const socket = await dockerExecStart(execId);

  const resize = (newCols, newRows) =>
    dockerAPI("POST", `/exec/${execId}/resize?h=${newRows}&w=${newCols}`, null, {
      statuses: [200, 201, 400, 404, 409],
    }).catch(() => {});

  return { socket, resize };
}

// Idle cleanup.
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions) {
    if (now - session.lastUsed > IDLE_TIMEOUT_MS) {
      removeSession(sessionId).catch(() => {});
    }
  }
}, 60_000).unref();

// On startup, clear any lab containers/networks left by a previous gateway.
(async function reapOrphans() {
  try {
    const filters = encodeURIComponent(JSON.stringify({ label: ["cyberbox.kind=lab"] }));
    const res = await dockerAPI("GET", `/containers/json?all=true&filters=${filters}`, null, { statuses: [200] });
    for (const container of res.data || []) {
      await dockerAPI("DELETE", `/containers/${container.Id}?v=1&force=1`, null, { statuses: [200, 204, 404, 409] }).catch(() => {});
    }
    const netFilters = encodeURIComponent(JSON.stringify({ label: ["cyberbox.kind=lab-session"] }));
    const nets = await dockerAPI("GET", `/networks?filters=${netFilters}`, null, { statuses: [200] });
    for (const network of nets.data || []) {
      await dockerAPI("DELETE", `/networks/${network.Id}`, null, { statuses: [200, 204, 404] }).catch(() => {});
    }
  } catch {
    // Best effort; orphan cleanup also runs via the idle timeout.
  }
})();
