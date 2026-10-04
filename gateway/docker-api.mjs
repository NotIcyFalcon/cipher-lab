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

        try {
          finish(null, {
            status: response.statusCode,
            data: raw
              ? buffer
              : buffer.length
                ? JSON.parse(buffer.toString("utf8"))
                : null,
          });
        } catch {
          finish(new Error("Docker returned invalid JSON."));
        }
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
