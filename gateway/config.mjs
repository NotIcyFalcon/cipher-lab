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

function loadLab(prefix) {
  const fingerprint = required(`${prefix}_HOST_FINGERPRINT`);

  if (!/^SHA256:[A-Za-z0-9+/]{43}$/.test(fingerprint)) {
    throw new Error(`Invalid ${prefix}_HOST_FINGERPRINT.`);
  }

  return {
    fingerprint,
    ssh: {
      host: required(`${prefix}_HOST`),
      port: portNumber(`${prefix}_PORT`),
      username: required(`${prefix}_USER`),
      privateKey: readFileSync(required(`${prefix}_KEY_FILE`)),
      passphrase: process.env[`${prefix}_KEY_PASSPHRASE`] || undefined,
    },
  };
}

// These IDs match labId values in src/content/lessons.ts.
export const labs = new Map([
  ["linux-basics", loadLab("LINUX")],
]);