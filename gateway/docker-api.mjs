import http from "node:http";

export function dockerAPI(method, path, body = null, options = {}) {
  const {
    raw = false,
    timeoutMs = 30_000,
    maxBytes = 2 * 1024 * 1024,
  } = options;

  const payload = body === null
    ? undefined
    : Buffer.isBuffer(body)
      ? body
      : Buffer.from(JSON.stringify(body));

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve(result);
    };

    const request = http.request({
      socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock",
      path: `/v${process.env.DOCKER_API_VERSION || "1.44"}${path}`,
      method,
      headers: {
        "Content-Type": Buffer.isBuffer(body)
          ? "application/x-tar"
          : "application/json",
        ...(payload ? { "Content-Length": payload.length } : {}),
      },
    }, (response) => {
      const chunks = [];
      let bytes = 0;

      response.on("data", (chunk) => {
        bytes += chunk.length;

        if (bytes > maxBytes) {
          finish(new Error("Docker output limit exceeded."));
          request.destroy();
          response.destroy();
          return;
        }

        chunks.push(chunk);
      });

      response.on("error", (error) => finish(error));
      response.on("aborted", () => finish(new Error("Docker response aborted.")));

      response.on("end", () => {
        const buffer = Buffer.concat(chunks);
        let data = null;

        if (raw) {
          data = buffer;
        } else if (buffer.length) {
          const text = buffer.toString("utf8");
          try {
            data = JSON.parse(text);
          } catch {
            // Some Docker errors are plain text; keep them readable.
            data = { message: text.trim() };
          }
        }

        finish(null, { status: response.statusCode, data });
      });
    });

    request.on("error", (error) => finish(error));

    timer = setTimeout(() => {
      finish(new Error("Docker operation timed out."));
      request.destroy();
    }, timeoutMs);

    request.end(payload);
  });
}

/**
 * Docker request whose response body is delivered chunk by chunk to onChunk
 * (for image pulls and exec output). Resolves { status } when the body ends.
 */
export function dockerStream(method, path, body, onChunk, options = {}) {
  const { timeoutMs = 30 * 60_000 } = options;

  const payload = body === null || body === undefined
    ? undefined
    : Buffer.isBuffer(body)
      ? body
      : Buffer.from(JSON.stringify(body));

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve(result);
    };

    const request = http.request({
      socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock",
      path: `/v${process.env.DOCKER_API_VERSION || "1.44"}${path}`,
      method,
      headers: {
        "Content-Type": Buffer.isBuffer(body) ? "application/x-tar" : "application/json",
        ...(payload ? { "Content-Length": payload.length } : {}),
      },
    }, (response) => {
      response.on("data", (chunk) => {
        try {
          onChunk(chunk, response.statusCode);
        } catch (error) {
          finish(error);
          request.destroy();
        }
      });
      response.on("error", (error) => finish(error));
      response.on("aborted", () => finish(new Error("Docker response aborted.")));
      response.on("end", () => finish(null, { status: response.statusCode }));
    });

    request.on("error", (error) => finish(error));

    timer = setTimeout(() => {
      finish(new Error("Docker operation timed out."));
      request.destroy();
    }, timeoutMs);

    request.end(payload);
  });
}

/**
 * Incremental decoder for Docker's multiplexed (non-TTY) stream format:
 * 8-byte headers [stream, 0, 0, 0, size(4, big-endian)] followed by payload.
 */
export function createDemuxer(onFrame) {
  let pending = Buffer.alloc(0);

  return (chunk) => {
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;

    while (pending.length >= 8) {
      const length = pending.readUInt32BE(4);
      if (pending.length < 8 + length) break;
      const stream = pending[0] === 2 ? "stderr" : "stdout";
      onFrame(stream, pending.subarray(8, 8 + length));
      pending = pending.subarray(8 + length);
    }
  };
}

// Start an exec instance and hijack the connection, returning the raw
// bidirectional socket. With Tty:true the stream is not multiplexed, so it can
// be piped straight to a terminal.
export function dockerExecStart(execId) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ Detach: false, Tty: true });

    const req = http.request({
      socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock",
      path: `/v${process.env.DOCKER_API_VERSION || "1.44"}/exec/${execId}/start`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Connection: "Upgrade",
        Upgrade: "tcp",
        "Content-Length": Buffer.byteLength(body),
      },
    });

    let settled = false;

    req.on("upgrade", (_res, socket) => {
      if (settled) return;
      settled = true;
      resolve(socket);
    });

    req.on("response", (res) => {
      // Some daemons answer 200 and hijack the same socket without an upgrade.
      if (settled) return;
      if (res.statusCode === 200) {
        settled = true;
        resolve(res.socket);
        return;
      }
      settled = true;
      reject(new Error(`exec start failed: HTTP ${res.statusCode}`));
    });

    req.on("error", (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });

    req.end(body);
  });
}

export function decodeDockerOutput(buffer) {
  const stdout = [];
  const stderr = [];
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      throw new Error("Incomplete Docker stream.");
    }

    const stream = buffer[offset];
    const length = buffer.readUInt32BE(offset + 4);
    offset += 8;

    if (![1, 2].includes(stream) || offset + length > buffer.length) {
      throw new Error("Invalid Docker stream.");
    }

    (stream === 1 ? stdout : stderr).push(
      buffer.subarray(offset, offset + length),
    );

    offset += length;
  }

  return {
    stdout: Buffer.concat(stdout),
    stderr: Buffer.concat(stderr),
  };
}
