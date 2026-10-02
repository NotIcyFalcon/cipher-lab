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
      error ? reject(error) : resolve(result);
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
