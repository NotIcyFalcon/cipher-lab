import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path === "/login") return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (await verifySession(token)) return NextResponse.next();

  if (path === "/api" || path.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.redirect(new URL("/login", request.url), 303);
}

export const config = {
  matcher: ["/((?!_next/static/).*)"],
};
