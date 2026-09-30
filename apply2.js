const fs = require('fs');
let content = fs.readFileSync('gateway/docker-manager.mjs', 'utf8');

const search = `function dockerAPI(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      socketPath: dockerSocketPath,
      path: \`/v1.44\${path}\`,
      method,
      headers: { "Content-Type": "application/json" },
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        try {
          resolve({ status: res.statusCode, data: raw ? JSON.parse(raw) : null });
        } catch {
          resolve({ status: res.statusCode, data: raw });
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error("Docker API timeout"));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}`;

const replace = `function dockerAPI(method, path, body = null, options = {}) {
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
        path: \`/v\${process.env.DOCKER_API_VERSION ?? "1.44"}\${path}\`,
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
}`;

content = content.replace(search, replace);
content += '\nstartHomeworkGrader(dockerAPI, composeProject);\n';
fs.writeFileSync('gateway/docker-manager.mjs', content);
