// Helpers for the gateway's internal (web -> gateway) HTTP endpoints.
import { timingSafeEqual } from "node:crypto";

export class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function internalToken() {
  const token = process.env.GRADER_INTERNAL_TOKEN?.trim();
  return token ? token : null;
}

export function authorized(header) {
  const token = internalToken();
  if (!token || typeof header !== "string") return false;

  const actual = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function readJson(request, limit = 8 * 1024 * 1024) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new HttpError("Payload too large.", 413);
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError("Invalid JSON payload.", 400);
  }
}

export function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

/**
 * Start a newline-delimited JSON response. Headers go out immediately and a
 * heartbeat line is written every 15s, so long builds never trip the client's
 * header or body timeouts.
 *   const stream = ndjson(res);
 *   stream.send({ type: "log", text });
 *   stream.end({ type: "result", ok: true });
 */
export function ndjson(res) {
  res.writeHead(200, {
    "Content-Type": "application/x-ndjson",
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no",
  });

  let open = true;
  const heartbeat = setInterval(() => {
    if (open) res.write('{"type":"heartbeat"}\n');
  }, 15_000);

  res.on("close", () => {
    open = false;
    clearInterval(heartbeat);
  });

  return {
    get open() {
      return open;
    },
    send(event) {
      if (open) res.write(JSON.stringify(event) + "\n");
    },
    log(text) {
      if (open && text) res.write(JSON.stringify({ type: "log", text }) + "\n");
    },
    end(event) {
      if (!open) return;
      res.write(JSON.stringify(event) + "\n");
      open = false;
      clearInterval(heartbeat);
      res.end();
    },
  };
}
