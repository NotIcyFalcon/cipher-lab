import { createServer } from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import ssh2 from "ssh2";
import WebSocket, { WebSocketServer } from "ws";
import {
  accessHashBytes,
  gatewayPort,
  labs,
  siteOrigin,
  labSshConfig,
  labFingerprint,
  maxRunningLabs,
} from "./config.mjs";
import { ensureLabRunning, touchLab } from "./docker-manager.mjs";

const { Client } = ssh2;

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

function validAccessCode(code) {
  if (typeof code !== "string" || !/^[a-f0-9]{64}$/.test(code)) {
    return false;
  }

  const suppliedHash = createHash("sha256").update(code).digest();
  return timingSafeEqual(suppliedHash, accessHashBytes);
}

function attachTerminal(ws) {
  const ssh = new Client();
  const started = Date.now();

  let stream;
  let authenticated = false;
  let closed = false;
  let pendingOutput = 0;
  let lastInput = started;
  let lastPong = started;
  let size = { cols: 80, rows: 24 };
  let connectedLabId = null;

  const setupTimer = setTimeout(
    () => stop("Connection setup timed out.", 1008),
    30_000, // Increased from 20s to allow for container startup
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

    stream?.destroy();
    ssh.destroy();

    if (ws.readyState === WebSocket.OPEN) {
      send({ type: "status", message });
      ws.close(code, "Session ended");
    }

    // Also release connections whose peers never complete the close handshake.
    setTimeout(() => ws.terminate(), 1_000).unref();
  }

  function output(chunk) {
    if (closed || ws.readyState !== WebSocket.OPEN) return;

    pendingOutput += chunk.length;

    if (
      pendingOutput > 512 * 1024 ||
      ws.bufferedAmount > 512 * 1024
    ) {
      return stop("Output buffer limit reached. Please reconnect.", 1008);
    }

    ws.send(chunk, { binary: true });

    if (pendingOutput >= 128 * 1024) {
      stream.pause();
      stream.stderr.pause();
    }
  }

  ws.on("pong", () => {
    lastPong = Date.now();
  });

  ws.on("close", () => stop("Disconnected."));
  ws.on("error", () => stop("Connection interrupted.", 1011));

  ssh.on("error", (error) => {
    console.error("[SSH connection]", error.message);
    stop("Could not open the lab. Ask the owner to check its configuration.", 1011);
  });

  ssh.on("close", () => stop("The SSH connection has closed."));

  ssh.on("ready", () => {
    if (closed) return;

    ssh.shell({ ...size, term: "xterm-256color" }, (error, channel) => {
      if (closed) {
        channel?.destroy();
        return;
      }

      if (error) {
        console.error("[SSH shell]", error.message);
        return stop("The lab could not start a shell.", 1011);
      }

      stream = channel;
      clearTimeout(setupTimer);

      stream.on("error", () => stop("Shell interrupted.", 1011));
      stream.stderr.on("error", () => stop("Shell interrupted.", 1011));
      stream.on("close", () => stop("Shell finished. You can connect again."));

      send({ type: "ready" });
      stream.on("data", output);
      stream.stderr.on("data", output);
    });
  });

  ws.on("message", (raw, binary) => {
    if (closed) return;

    try {
      if (binary) return stop("Unsupported message format.", 1008);

      const message = JSON.parse(raw.toString());

      if (!message || typeof message !== "object" || Array.isArray(message)) {
        return stop("Invalid terminal message.", 1008);
      }

      if (!authenticated) {
        if (
          message.type !== "auth" ||
          !validAccessCode(message.code)
        ) {
          return stop("Access code not accepted.", 1008);
        }

        if (!labs.has(message.labId) || !validSize(message)) {
          return stop("Unknown lab or invalid terminal size.", 1008);
        }

        authenticated = true;
        connectedLabId = message.labId;
        size = { cols: message.cols, rows: message.rows };

        // Tell the frontend we're starting the container
        send({ type: "status", message: "Starting lab environment..." });

        // Start the container on-demand, then SSH into it
        ensureLabRunning(message.labId)
          .then((host) => {
            if (closed) return;

            send({ type: "status", message: "Connecting to lab..." });

            ssh.connect({
              host,
              port: labSshConfig.port,
              username: labSshConfig.username,
              privateKey: labSshConfig.privateKey,
              passphrase: labSshConfig.passphrase,
              readyTimeout: 15_000,
              keepaliveInterval: 15_000,
              keepaliveCountMax: 2,
              algorithms: {
                serverHostKey: ["ssh-ed25519"],
              },
              hostVerifier(key) {
                const digest = createHash("sha256")
                  .update(key)
                  .digest("base64")
                  .replace(/=+$/, "");

                return `SHA256:${digest}` === labFingerprint;
              },
            });
          })
          .catch((err) => {
            console.error("[Docker]", err.message);
            stop("Could not start the lab environment. " + err.message, 1011);
          });

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
        if (connectedLabId) touchLab(connectedLabId);
        stream.write(message.data);
        return;
      }

      if (message.type === "resize" && validSize(message)) {
        stream.setWindow(message.rows, message.cols, 0, 0);
        return;
      }

      if (
        message.type === "ack" &&
        Number.isSafeInteger(message.bytes) &&
        message.bytes > 0 &&
        message.bytes <= pendingOutput
      ) {
        pendingOutput -= message.bytes;

        if (pendingOutput < 64 * 1024) {
          stream.resume();
          stream.stderr.resume();
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
  console.log(`Max concurrent labs: ${labs.size} defined, ${maxRunningLabs} max running`);
});