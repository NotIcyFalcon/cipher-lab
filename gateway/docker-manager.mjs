// On-demand lab sessions. A session is a set of fresh containers (one per
// machine in the lab's last successful build) on a private network with no
// internet. The learner's terminal attaches to the entry machine with
// `docker exec`. A session is kept between terminal connections, so files
// survive a reconnect, and is removed after 15 minutes without use, when the
// learner resets it, or to make room under the lab limits.

import { randomUUID } from "node:crypto";
import { dockerAPI, dockerExecStart } from "./docker-api.mjs";
import { maxRunningLabs } from "./config.mjs";

const IDLE_TIMEOUT_MS = 15 * 60_000;
const MEMORY_BUDGET_MB = Number(process.env.LAB_MEMORY_BUDGET_MB || "384");
const WEB_ORIGIN = process.env.WEB_INTERNAL_ORIGIN || "http://web:3000";

// labId -> { id, labId, buildId, lastUsed, memoryMb, network, entry, containers, terminals }
const sessions = new Map();
const starting = new Map();

function fail(message, code) {
  return Object.assign(new Error(message), { code });
}

function dockerMessage(res, fallback) {
  const message = res?.data?.message;
  return typeof message === "string" && message ? `${fallback} (${message})` : fallback;
}

async function fetchRuntime(labId) {
  const token = process.env.GRADER_INTERNAL_TOKEN;
  let res;

  try {
    res = await fetch(`${WEB_ORIGIN}/api/internal/lab-runtime?labId=${encodeURIComponent(labId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error) {
    throw new Error(`Could not reach the web app for lab details: ${error.message}`);
  }

  const body = await res.json().catch(() => ({}));

  if (res.status === 404) throw fail("This lab no longer exists. Ask the owner to check the chapter.", "UNKNOWN_LAB");
  if (res.status === 409) throw fail(body.error || "This lab is not ready yet.", "NOT_READY");
  if (!res.ok) throw new Error(body.error || `Lab lookup failed (HTTP ${res.status}).`);
  if (!Array.isArray(body.machines) || body.machines.length === 0) {
    throw fail("This lab is not ready yet.", "NOT_READY");
  }

  return body;
}

function specMemory(spec) {
  return spec.machines.reduce((sum, m) => sum + (Number(m.memoryMb) || 128), 0);
}

function runningMemory() {
  let total = 0;
  for (const session of sessions.values()) total += session.memoryMb;
  return total;
}

async function removeSession(labId, reason = "This lab session was stopped.") {
  const session = sessions.get(labId);
  if (!session) return;
  sessions.delete(labId);

  // Tell any open terminals why their lab went away.
  for (const notify of session.terminals) notify(reason);
  session.terminals.clear();

  for (const container of session.containers) {
    await dockerAPI("DELETE", `/containers/${container.id}?v=1&force=1`).catch(() => {});
  }
  if (session.network) {
    await dockerAPI("DELETE", `/networks/${session.network}`).catch(() => {});
  }
}

// Make room for a new session: at most maxRunningLabs sessions, and their
// machines within the memory budget. Least recently used sessions go first.
async function enforceLimits(incomingMemory) {
  const oldest = () => [...sessions.values()].sort((a, b) => a.lastUsed - b.lastUsed)[0];
  const message = "This lab was stopped to make room for another lab (only 2 labs can run at once).";

  while (sessions.size >= maxRunningLabs) {
    const victim = oldest();
    if (!victim) break;
    await removeSession(victim.labId, message);
  }
  while (sessions.size > 0 && runningMemory() + incomingMemory > MEMORY_BUDGET_MB) {
    const victim = oldest();
    if (!victim) break;
    await removeSession(victim.labId, message);
  }
}

function hostConfigFor(machine, networkName) {
  const caps = ["CHOWN", "DAC_OVERRIDE", "FOWNER", "SETGID", "SETUID", "KILL"];
  const securityOpt = [];

  if (machine.allowPrivilegeEscalation) {
    // sudo and SUID binaries must be able to gain root in these labs.
    caps.push("SETPCAP", "AUDIT_WRITE");
  } else {
    securityOpt.push("no-new-privileges:true");
  }
  if (machine.rawNetwork) caps.push("NET_RAW", "NET_ADMIN");

  const memBytes = (Number(machine.memoryMb) || 128) * 1024 * 1024;

  return {
    NetworkMode: networkName,
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
    RestartPolicy: { Name: "no" },
    Sysctls: { "net.ipv4.ip_unprivileged_port_start": "0" },
    Tmpfs: { "/run": "rw,nosuid,nodev,size=16m" },
    LogConfig: { Type: "json-file", Config: { "max-size": "1m", "max-file": "1" } },
  };
}

async function waitRunning(containerId, deadlineMs = 15_000) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    const res = await dockerAPI("GET", `/containers/${containerId}/json`);
    if (res.status === 200 && res.data.State?.Running) return;
    if (res.status === 200 && res.data.State?.Status === "exited") {
      throw new Error("A lab machine stopped right after starting. Check its start script and services.");
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("A lab machine did not start in time.");
}

async function createSession(labId, spec) {
  const id = randomUUID().slice(0, 12);
  const networkName = `cyberbox-sess-${id}`;
  const memoryMb = specMemory(spec);

  await enforceLimits(memoryMb);

  const net = await dockerAPI("POST", "/networks/create", {
    Name: networkName,
    Driver: "bridge",
    Internal: true, // no internet inside a running lab
    EnableIPv6: false,
    Labels: { "cyberbox.kind": "lab-session", "cyberbox.session": id },
  });
  if (net.status !== 201) throw new Error(dockerMessage(net, "Could not create the lab network"));

  const session = {
    id,
    labId,
    buildId: spec.buildId,
    lastUsed: Date.now(),
    memoryMb,
    network: net.data.Id,
    entry: null,
    containers: [],
    terminals: new Set(),
  };
  sessions.set(labId, session);

  try {
    for (const machine of spec.machines) {
      const created = await dockerAPI(
        "POST",
        `/containers/create?name=${encodeURIComponent(`cyberbox-lab-${id}-${machine.hostname}`)}`,
        {
          Image: machine.image,
          Hostname: machine.hostname,
          Labels: { "cyberbox.kind": "lab", "cyberbox.session": id },
          HostConfig: hostConfigFor(machine, networkName),
          NetworkingConfig: { EndpointsConfig: { [networkName]: { Aliases: [machine.hostname] } } },
        },
      );

      if (created.status === 404) {
        throw fail("This lab's images are missing. Rebuild the lab in the Creator.", "NOT_READY");
      }
      if (created.status !== 201) throw new Error(dockerMessage(created, `Could not create machine "${machine.hostname}"`));

      const containerId = created.data.Id;
      session.containers.push({ id: containerId, hostname: machine.hostname });

      const started = await dockerAPI("POST", `/containers/${containerId}/start`);
      if (started.status !== 204 && started.status !== 304) {
        throw new Error(dockerMessage(started, `Could not start machine "${machine.hostname}"`));
      }
      await waitRunning(containerId);

      if (machine.key === spec.entryMachine) {
        session.entry = {
          containerId,
          user: machine.mainUser || "root",
          policyMode: spec.policyMode || "none",
        };
      }
    }

    if (!session.entry) throw new Error("The lab has no entry machine.");
    return session;
  } catch (error) {
    await removeSession(labId);
    throw error;
  }
}

async function containerRunning(containerId) {
  const res = await dockerAPI("GET", `/containers/${containerId}/json`);
  return res.status === 200 && res.data.State?.Running === true;
}

/**
 * Open (or reuse) the session for a lab. `reset` discards the existing one.
 * `onStopped` is called if the session is removed while this terminal is open.
 * Returns { containerId, user, policyMode, release }.
 */
export async function openLabSession(labId, { reset = false, onStopped } = {}) {
  const spec = await fetchRuntime(labId);

  let pending = starting.get(labId);
  if (!pending) {
    pending = (async () => {
      const existing = sessions.get(labId);
      const stale =
        !existing ||
        reset ||
        existing.buildId !== spec.buildId ||
        !(await containerRunning(existing.entry.containerId));

      if (!stale) return existing;
      if (existing) await removeSession(labId, "This lab was restarted.");
      return createSession(labId, spec);
    })().finally(() => starting.delete(labId));
    starting.set(labId, pending);
  }

  const session = await pending;
  session.lastUsed = Date.now();
  if (onStopped) session.terminals.add(onStopped);

  return {
    containerId: session.entry.containerId,
    user: session.entry.user,
    policyMode: session.entry.policyMode,
    touch() {
      session.lastUsed = Date.now();
    },
    release() {
      session.lastUsed = Date.now();
      if (onStopped) session.terminals.delete(onStopped);
    },
  };
}

// How the interactive shell starts, given the command policy.
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

  const create = await dockerAPI("POST", `/containers/${containerId}/exec`, {
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
    User: user || "root",
    Env: shell.Env,
    WorkingDir: user && user !== "root" ? `/home/${user}` : "/root",
    Cmd: shell.Cmd,
    ConsoleSize: [rows, cols],
  });

  if (create.status === 404) throw new Error("The lab session has ended. Connect again.");
  if (create.status !== 201) throw new Error(dockerMessage(create, "Could not open a shell"));
  const execId = create.data.Id;

  const socket = await dockerExecStart(execId);

  const resize = (newCols, newRows) =>
    dockerAPI("POST", `/exec/${execId}/resize?h=${newRows}&w=${newCols}`).catch(() => {});

  void resize(cols, rows);
  return { socket, resize };
}

// Idle cleanup: sessions unused for 15 minutes are removed.
setInterval(() => {
  const now = Date.now();
  for (const session of sessions.values()) {
    if (now - session.lastUsed > IDLE_TIMEOUT_MS) {
      removeSession(session.labId, "This lab stopped after 15 minutes without use.").catch(() => {});
    }
  }
}, 60_000).unref();

// On startup, clear containers and networks left by a previous gateway run
// (lab sessions, interrupted image builds and grading jobs).
(async function reapOrphans() {
  try {
    for (const kind of ["lab", "image-build", "homework-run"]) {
      const filters = encodeURIComponent(JSON.stringify({ label: [`cyberbox.kind=${kind}`] }));
      const res = await dockerAPI("GET", `/containers/json?all=true&filters=${filters}`);
      for (const container of Array.isArray(res.data) ? res.data : []) {
        await dockerAPI("DELETE", `/containers/${container.Id}?v=1&force=1`).catch(() => {});
      }
    }

    const netFilters = encodeURIComponent(JSON.stringify({ label: ["cyberbox.kind=lab-session"] }));
    const nets = await dockerAPI("GET", `/networks?filters=${netFilters}`);
    for (const network of Array.isArray(nets.data) ? nets.data : []) {
      await dockerAPI("DELETE", `/networks/${network.Id}`).catch(() => {});
    }
  } catch (error) {
    console.error("[Docker] Startup cleanup failed:", error.message);
  }
})();
