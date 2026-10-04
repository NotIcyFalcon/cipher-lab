// One internal HTTP server for web -> gateway calls (never exposed publicly;
// Caddy only routes /lab-socket to the gateway). Every route requires the
// shared GRADER_INTERNAL_TOKEN bearer token.
import http from "node:http";
import { HttpError, authorized, internalToken, sendJson } from "./internal-http.mjs";
import { handleBuildLab, handleDeleteLab } from "./lab-builder.mjs";
import { handleBuildEnvironment, handleDeleteHomework, handleRun } from "./homework-runner.mjs";

const routes = {
  "POST /labs/build": handleBuildLab,
  "POST /labs/delete": handleDeleteLab,
  "POST /homework/build-env": handleBuildEnvironment,
  "POST /homework/run": handleRun,
  "POST /homework/delete": handleDeleteHomework,
};

export function startInternalServer() {
  const token = internalToken();
  if (!token) {
    console.error("[Internal API] GRADER_INTERNAL_TOKEN is missing; lab builds and homework grading are disabled.");
  } else if (token.length < 16) {
    console.warn("[Internal API] GRADER_INTERNAL_TOKEN is short; use a long random value (e.g. openssl rand -hex 24).");
  }

  const server = http.createServer(async (req, res) => {
    const handler = routes[`${req.method} ${req.url}`];

    if (!handler) return sendJson(res, 404, { ok: false, error: "Not found." });
    if (!authorized(req.headers.authorization)) return sendJson(res, 401, { ok: false, error: "Unauthorized." });

    try {
      await handler(req, res);
    } catch (error) {
      if (res.headersSent) {
        res.end();
        return;
      }
      if (error instanceof HttpError) {
        return sendJson(res, error.status, { ok: false, error: error.message });
      }
      console.error("[Internal API]", error);
      sendJson(res, 500, { ok: false, error: "The request could not finish." });
    }
  });

  // Builds and grading runs stream for many minutes.
  server.requestTimeout = 0;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;

  const port = Number(process.env.GRADER_PORT || 3002);
  server.listen(port, "0.0.0.0", () => {
    console.log(`[Internal API] Listening on ${port}.`);
  });

  return server;
}
