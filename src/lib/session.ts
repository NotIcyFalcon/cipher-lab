import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-cyberbox-session"
    : "cyberbox-session";

export const SESSION_SECONDS = 8 * 60 * 60;

function signingKey() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("Configure a strong SESSION_SECRET.");
  }

  return new TextEncoder().encode(secret);
}

export function createSession() {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("Ronak")
    .setIssuer("cyber-box")
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_SECONDS)
    .sign(signingKey());
}

export async function verifySession(token?: string): Promise<boolean> {
  if (!token) return false;

  try {
    await jwtVerify(token, signingKey(), {
      algorithms: ["HS256"],
      subject: "Ronak",
      issuer: "cyber-box",
      requiredClaims: ["exp"],
    });
    return true;
  } catch {
    return false;
  }
}
