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

export function createSession(userId: "ronak" | "admin" = "ronak") {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("cyber-box")
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_SECONDS)
    .sign(signingKey());
}

export async function verifySession(token?: string): Promise<"ronak" | "admin" | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ["HS256"],
      issuer: "cyber-box",
      requiredClaims: ["exp", "sub"],
    });
    
    if (payload.sub === "ronak" || payload.sub === "admin") {
      return payload.sub as "ronak" | "admin";
    }
    return null;
  } catch {
    return null;
  }
}
