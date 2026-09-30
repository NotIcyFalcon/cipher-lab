import { readFileSync } from "node:fs";

function required(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function portNumber(name) {
  const value = Number(required(name));

  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`Invalid port: ${name}`);
  }

  return value;
}

export const siteOrigin = required("SITE_ORIGIN");
const origin = new URL(siteOrigin);

if (origin.origin !== siteOrigin) {
  throw new Error("SITE_ORIGIN must be an origin without a trailing slash.");
}

const localHosts = ["localhost", "127.0.0.1", "[::1]"];

if (
  origin.protocol !== "https:" &&
  !(origin.protocol === "http:" && localHosts.includes(origin.hostname))
) {
  throw new Error("Use HTTPS for a non-local SITE_ORIGIN.");
}

export const gatewayPort = portNumber("GATEWAY_PORT");

const accessHash = required("LAB_ACCESS_HASH");

if (!/^[a-f0-9]{64}$/.test(accessHash)) {
  throw new Error("LAB_ACCESS_HASH must be a SHA-256 hash in lowercase hex.");
}

export const accessHashBytes = Buffer.from(accessHash, "hex");

// Docker socket path for on-demand container management
export const dockerSocketPath = process.env.DOCKER_SOCKET || "/var/run/docker.sock";

// Compose project name (used to find containers)
export const composeProject = process.env.COMPOSE_PROJECT || "cipher-lab";

// Max concurrent lab containers
export const maxRunningLabs = Number(process.env.MAX_RUNNING_LABS || "3");

// SSH key and fingerprint shared by all lab containers
export const labSshConfig = {
  port: 2222,
  username: required("LINUX_USER"),
  privateKey: readFileSync(required("LINUX_KEY_FILE")),
  passphrase: process.env.LINUX_KEY_PASSPHRASE || undefined,
};

export const labFingerprint = required("LINUX_HOST_FINGERPRINT");

if (!/^SHA256:[A-Za-z0-9+/]{43}$/.test(labFingerprint)) {
  throw new Error("Invalid LINUX_HOST_FINGERPRINT.");
}

// Lab definitions: labId -> Docker Compose service name
// All labs share the same image, SSH key, and fingerprint.
// The gateway starts/stops these containers on demand.
export const labs = new Map([
  ["linux-basics", { service: "linux-basics" }],
  // Add more labs here:
  // ["web-exploit", { service: "web-exploit" }],
  // ["ctf-forensics", { service: "ctf-forensics" }],
]);