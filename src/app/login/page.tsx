import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Box, LogIn } from "lucide-react";
import bcrypt from "bcryptjs";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "@/lib/session";

async function login(formData: FormData) {
  "use server";

  const password = formData.get("password");
  const hash = process.env.RONAK_PASSWORD_HASH;

  if (!hash) throw new Error("Configure RONAK_PASSWORD_HASH.");

  if (
    formData.get("username") !== "Ronak" ||
    typeof password !== "string" ||
    !password ||
    bcrypt.truncates(password) ||
    !(await bcrypt.compare(password, hash))
  ) {
    redirect("/login?error=1");
  }

  (await cookies()).set(SESSION_COOKIE, await createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });

  redirect("/dashboard");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="login-shell">
      <section className="quiz-card login-card" aria-labelledby="login-title">
        <div className="brand">
          <span className="brand-icon">
            <Box size={22} aria-hidden="true" />
          </span>
          <span>Cyber <span className="accent">Box</span></span>
        </div>

        <h1 id="login-title">Welcome back, Ronak.</h1>
        <p>A box made to learn Cyber Sec.</p>

        <form action={login} className="login-form">
          <label className="terminal-code">
            <span>Username</span>
            <input
              name="username"
              defaultValue="Ronak"
              autoComplete="username"
              maxLength={32}
              required
            />
          </label>

          <label className="terminal-code">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              maxLength={72}
              required
            />
          </label>

          {error === "1" && (
            <p className="quiz-feedback" role="alert">
              Invalid username or password.
            </p>
          )}

          <button className="primary-button" type="submit">
            <LogIn size={17} aria-hidden="true" />
            Enter Cyber Box
          </button>
        </form>
      </section>
    </main>
  );
}
