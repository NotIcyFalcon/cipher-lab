import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Preserve the existing Learning Path behavior:
 * surrounding whitespace and letter case are ignored.
 */
export function hashLabAnswer(value: string): string {
  return createHash("sha256")
    .update(value.trim().toLowerCase(), "utf8")
    .digest("hex");
}

/**
 * CTF flags are case-sensitive; surrounding whitespace is ignored.
 * The CTF submission action must use this same function.
 */
export function hashCtfFlag(value: string): string {
  return createHash("sha256")
    .update(value.trim(), "utf8")
    .digest("hex");
}

export function matchesDigest(
  actualDigest: string,
  expectedDigest: string | null | undefined,
): boolean {
  if (
    !expectedDigest ||
    !/^[a-f0-9]{64}$/i.test(expectedDigest) ||
    !/^[a-f0-9]{64}$/i.test(actualDigest)
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(actualDigest, "hex"),
    Buffer.from(expectedDigest, "hex"),
  );
}
