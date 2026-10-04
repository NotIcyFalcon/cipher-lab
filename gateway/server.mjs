import { createServer } from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import WebSocket, { WebSocketServer } from "ws";
import {
  accessHashBytes,
  gatewayPort,
  siteOrigin,
  maxRunningLabs,
} from "./config.mjs";
import {
  openLabSession,
  execShell,
  touchSession,
  closeSession,
} from "./docker-manager.mjs";

const server = createServer((request, response) => {
  request.resume();
  response.writeHead(404).end();
});

server.headersTimeout = 10_000;
server.requestTimeout = 10_000;

const sockets = new WebSocketServer({
  noServer: true,
  maxPayload: 32 * 1024,
  perMessageDeflate: false,
});

// A global limit is intentional for this small, private gateway.
let attemptWindow = Date.now();
let attempts = 0;

function reject(socket, status) {
  socket.end(
    `HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
  );
}

server.on("upgrade", (request, socket, head) => {
  socket.on("error", () => {});

  if (
    request.url !== "/lab-socket" ||
    request.headers.origin !== siteOrigin
  ) {
    return reject(socket, "403 Forbidden");
  }

  if (Date.now() - attemptWindow >= 60_000) {
    attemptWindow = Date.now();
    attempts = 0;
  }

  if (++attempts > 30) {
    return reject(socket, "429 Too Many Requests");
  }

  if (sockets.clients.size >= 4) {
    return reject(socket, "503 Service Unavailable");
  }

  sockets.handleUpgrade(request, socket, head, attachTerminal);
});

function validSize(message) {
  return (
    Number.isInteger(message.cols) &&
    Number.isInteger(message.rows) &&
    message.cols >= 1 &&
    message.cols <= 500 &&
    message.rows >= 1 &&
    message.rows <= 200
  );
}

// Lab IDs come from the Creator (UUIDs) or older content (slugs).
function validLabId(labId) {
  return typeof labId === "string" && /^[A-Za-z0-9][A-Za-z0-9:_.-]{0,127}$/.test(labId);
}

function validAccessCode(code) {
  if (typeof code !== "string" || !/^[a-f0-9]{64}$/.test(code)) {
    return false;
  }

  const suppliedHash = createHash("sha256").update(code).digest();
  return timingSafeEqual(suppliedHash, accessHashBytes);
}

function attachTerminal(ws) {
  const started = Date.now();

  let stream = null;
  let resizeShell = null;
  let sessionId = null;
  let authenticated = false;
  let closed = false;
  let pendingOutput = 0;
  let lastInput = started;
  let lastPong = started;
  let size = { cols: 80, rows: 24 };

  // Container start (up to ~10s) plus the exec handshake must fit here.
  const setupTimer = setTimeout(
    () => stop("Connection setup timed out.", 1008),
    45_000,
  );

  const watchdog = setInterval(() => {
    const now = Date.now();

    if (now - started > 30 * 60_000) {
      return stop("Session finished. Connect again to continue.");
    }

    if (now - lastInput > 10 * 60_000) {
      return stop("Session paused after 10 minutes without keyboard input.");
    }

    if (now - lastPong > 45_000) {
      return stop("Connection lost.", 1001);
    }

    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, 15_000);

  function send(message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  function stop(message, code = 1000) {
    if (closed) return;
    closed = true;

    clearTimeout(setupTimer);
    clearInterval(watchdog);

    if (stream) {
      stream.destroy();
      stream = null;
    }

    // Tear down the lab containers for this session.
    if (sessionId) {
      closeSession(sessionId).catch(() => {});
      sessionId = null;
    }

    if (ws.readyState === WebSocket.OPEN) {
      send({ type: "status", message });
      ws.close(code, "Session ended");
    }

    setTimeout(() => ws.terminate(), 1_000).unref();
  }

  function output(chunk) {
    if (closed || ws.readyState !== WebSocket.OPEN) return;

    pendingOutput += chunk.length;

    if (pendingOutput > 512 * 1024 || ws.bufferedAmount > 512 * 1024) {
      return stop("Output buffer limit reached. Please reconnect.", 1008);
    }

    ws.send(chunk, { binary: true });

    if (pendingOutput >= 128 * 1024 && stream) {
      stream.pause();
    }
  }

  ws.on("pong", () => {
    lastPong = Date.now();
  });

  ws.on("close", () => stop("Disconnected."));
  ws.on("error", () => stop("Connection interrupted.", 1011));

  async function openShell(labId) {
    try {
      send({ type: "status", message: "Starting lab environment..." });
      const session = await openLabSession(labId);
      if (closed) {
        closeSession(session.sessionId).catch(() => {});
        return;
      }
      sessionId = session.sessionId;

      send({ type: "status", message: "Connecting to lab..." });

      const shell = await execShell({
        containerId: session.containerId,
        user: session.user,
        policyMode: session.policyMode,
        cols: size.cols,
        rows: size.rows,
      });

      if (closed) {
        shell.socket.destroy();
        return;
      }

      stream = shell.socket;
      resizeShell = shell.resize;
      clearTimeout(setupTimer);

      stream.on("data", output);
      stream.on("error", () => stop("Shell interrupted.", 1011));
      stream.on("close", () => stop("Shell finished. You can connect again."));

      send({ type: "ready" });
    } catch (error) {
      console.error("[Lab session]", error.message);

      if (error.code === "UNKNOWN_LAB") {
        return stop("This lab no longer exists. Ask the owner to check the chapter.", 1008);
      }
      if (error.code === "NOT_READY") {
        return stop("This lab has not been built yet. Ask the owner to build it.", 1008);
      }
      stop("Could not start the lab environment. " + error.message, 1011);
    }
  }

  ws.on("message", (raw, binary) => {
    if (closed) return;

    try {
      if (binary) return stop("Unsupported message format.", 1008);

      const message = JSON.parse(raw.toString());

      if (!message || typeof message !== "object" || Array.isArray(message)) {
        return stop("Invalid terminal message.", 1008);
      }

      if (!authenticated) {
        if (message.type !== "auth" || !validAccessCode(message.code)) {
          return stop("Access code not accepted.", 1008);
        }
        if (!validLabId(message.labId)) {
          return stop("Unknown lab.", 1008);
        }
        if (!validSize(message)) {
          return stop("Invalid terminal size.", 1008);
        }

        authenticated = true;
        size = { cols: message.cols, rows: message.rows };
        void openShell(message.labId);
        return;
      }

      if (!stream) {
        return stop("The shell is still starting.", 1008);
      }

      if (
        message.type === "input" &&
        typeof message.data === "string" &&
        message.data.length <= 4096
      ) {
        const queued = stream.writableLength + Buffer.byteLength(message.data);
        if (queued > 64 * 1024) {
          return stop("Input buffer limit reached.", 1008);
        }

        lastInput = Date.now();
        if (sessionId) touchSession(sessionId);
        stream.write(message.data);
        return;
      }

      if (message.type === "resize" && validSize(message)) {
        size = { cols: message.cols, rows: message.rows };
        resizeShell?.(message.cols, message.rows);
        return;
      }

      if (
        message.type === "ack" &&
        Number.isSafeInteger(message.bytes) &&
        message.bytes > 0 &&
        message.bytes <= pendingOutput
      ) {
        pendingOutput -= message.bytes;
        if (pendingOutput < 64 * 1024 && stream) {
          stream.resume();
        }
        return;
      }

      stop("Invalid terminal message.", 1008);
    } catch (error) {
      console.error("[Gateway]", error.message);
      stop("The connection could not continue.", 1011);
    }
  });
}

const bindHost = process.env.GATEWAY_BIND_HOST || "127.0.0.1";

server.listen(gatewayPort, bindHost, () => {
  console.log(`Lab gateway listening on ${bindHost}:${gatewayPort}`);
  console.log(`Max concurrent lab sessions: ${maxRunningLabs}`);
});
