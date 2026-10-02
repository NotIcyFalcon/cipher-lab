import http from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { dockerAPI, decodeDockerOutput } from "./docker-api.mjs";

const BODY_LIMIT = 16 * 1024 * 1024;
const JOB_MS = 900_000;

class GradingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function authorized(header, token) {
  const actual = Buffer.from(typeof header === "string" ? header : "");
  const expected = Buffer.from(`Bearer ${token}`);

  return actual.length === expected.length &&
    timingSafeEqual(actual, expected);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT) {
      throw new GradingError("Payload too large.", 413);
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new GradingError("Invalid JSON payload.", 400);
  }
}

async function grade(job) {
  const jobId = randomUUID();
  const slotName = `cyberbox-homework-grader-${jobId}`;
  const image = process.env.GRADER_IMAGE ?? "cyberbox-homework:1";

  const payloadBuffer = Buffer.from(JSON.stringify(job), "utf8");
  let containerId;

  try {
    const created = await dockerAPI(
      "POST",
      `/containers/create?name=${encodeURIComponent(slotName)}`,
      {
        Image: image,
        User: "0:0",
        WorkingDir: "/",
        Cmd: ["python3", "/usr/local/lib/worker.py"],
        Labels: {
          "cyberbox.kind": "homework",
          "cyberbox.job": jobId,
        },
        NetworkDisabled: true,
        HostConfig: {
          AutoRemove: true,
          Init: true,
          NetworkMode: "none",
          ReadonlyRootfs: true,
          CapDrop: ["ALL"],
          SecurityOpt: ["no-new-privileges:true"],
          Memory: 512 * 1024 * 1024,
          MemorySwap: 512 * 1024 * 1024,
          NanoCpus: 1_000_000_000,
          PidsLimit: 128,
          Tmpfs: {
            "/tmp": "rw,noexec,nosuid,nodev,size=32m,mode=1777",
            "/jails": "rw,noexec,nosuid,nodev,size=256m,mode=0700"
          },
          LogConfig: { Type: "none", Config: {} },
          Binds: [],
        },
      },
      { statuses: [201, 404, 409] }
    );

    if (created.status === 404) {
      throw new GradingError("Grader image not found.", 500);
    }
    if (created.status === 409) {
      throw new GradingError("Grader slot conflict.", 503);
    }
    containerId = created.data.Id;

    const tarHeader = Buffer.alloc(512);
    tarHeader.write("job/input.json", 0, 100);
    tarHeader.write("0000600 \0", 100, 8);
    tarHeader.write("0000000 \0", 108, 8);
    tarHeader.write("0000000 \0", 116, 8);
    tarHeader.write(payloadBuffer.length.toString(8).padStart(11, "0") + " ", 124, 12);
    tarHeader.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, "0") + " ", 136, 12);
    tarHeader.write("        ", 148, 8);
    tarHeader.write("0", 156, 1);
    tarHeader.write("ustar  \0", 257, 8);
    
    let chksum = 0;
    for (let i = 0; i < 512; i++) chksum += tarHeader[i];
    tarHeader.write(chksum.toString(8).padStart(6, "0") + "\0 ", 148, 8);
    
    const paddingLength = 512 - (payloadBuffer.length % 512);
    const padding = paddingLength === 512 ? Buffer.alloc(0) : Buffer.alloc(paddingLength);
    const tarArchive = Buffer.concat([tarHeader, payloadBuffer, padding, Buffer.alloc(1024)]);

    await dockerAPI("PUT", `/containers/${containerId}/archive?path=/`, tarArchive, {
      statuses: [200],
    });

    await dockerAPI("POST", `/containers/${containerId}/start`, null, {
      statuses: [204, 304]
    });

    const attach = await dockerAPI(
      "POST",
      `/containers/${containerId}/attach?stream=1&stdout=1&stderr=1`,
      null,
      { raw: true, timeoutMs: JOB_MS }
    );

    const wait = await dockerAPI("POST", `/containers/${containerId}/wait`, null, {
      timeoutMs: JOB_MS + 5000,
      statuses: [200]
    });
    
    const output = decodeDockerOutput(attach.data);
    
    if (wait.data.StatusCode !== 0) {
      console.error("[Homework grader] Worker failed:", wait.data.StatusCode, output.stderr.toString("utf8").slice(0, 500));
      throw new GradingError("Grading infrastructure failed.", 500);
    }
    
    return JSON.parse(output.stdout.toString("utf8"));
  } finally {
    if (containerId) {
      try {
        await dockerAPI("DELETE", `/containers/${containerId}?v=1&force=1`, null, { statuses: [204, 404] });
      } catch {
      }
    }
  }
}

export function createGrader(token) {
  const server = http.createServer(
    { requestTimeout: 10_000, headersTimeout: 5000 },
    async (req, res) => {
      function send(status, body) {
        res.writeHead(status, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(JSON.stringify(body));
      }

      if (req.method !== "POST" || req.url !== "/grade-homework") {
        send(404, { ok: false, error: "Not found." });
        return;
      }

      if (!authorized(req.headers.authorization, token)) {
        send(401, { ok: false, error: "Unauthorized." });
        return;
      }

      try {
        const result = await grade(await readJson(req));
        send(200, result);
      } catch (error) {
        if (error instanceof GradingError) {
          send(error.status, { ok: false, error: error.message });
          return;
        }

        console.error("[Homework grader]", error);
        send(500, {
          ok: false,
          error: "The grader could not finish this submission. Please retry.",
        });
      }
    }
  );

  server.listen(
    Number(process.env.GRADER_PORT ?? 3002),
    "0.0.0.0",
    () => console.log("[Homework grader] Internal endpoint ready.")
  );

  return server;
}

const token = process.env.GRADER_TOKEN || "test-token";
if (process.env.NODE_ENV !== "test") {
  createGrader(token);
}
