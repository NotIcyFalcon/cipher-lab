import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function requireUserId(): Promise<"ronak" | "admin"> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await verifySession(token);
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRonakId(): Promise<string> {
  // Keeping this for compatibility with existing routes.
  // Ideally, routes should migrate to requireUserId().
  const user = await requireUserId();
  return user;
}
