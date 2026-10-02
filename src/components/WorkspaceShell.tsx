import type { ReactNode } from "react";
import Link from "next/link";
import { Box, UserRound, Settings } from "lucide-react";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/paths", label: "Learning Paths" },
  { href: "/homework", label: "Homework" },
  { href: "/ctf", label: "CTF" },
  { href: "/profile", label: "Profile" },
];

export default function WorkspaceShell({
  current,
  userId,
  children,
}: {
  current: string;
  userId: string;
  children: ReactNode;
}) {
  const isAdmin = userId === "admin";
  
  return (
    <div className="workspace-frame">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className="workspace-header">
        <div className="workspace-header-inner">
          <Link
            href="/dashboard"
            className="workspace-brand"
            aria-label="Cyber Box home"
          >
            <span className="workspace-brand-mark">
              <Box size={21} aria-hidden="true" />
            </span>
            <span>
              Cyber <span className="accent">Box</span>
            </span>
          </Link>

          <nav className="workspace-navigation" aria-label="Main navigation">
            {navigation.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`workspace-nav-link${
                  current === href ? " is-active" : ""
                }`}
                aria-current={current === href ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isAdmin && (
              <Link
                href="/admin/settings"
                className={`workspace-profile${
                  current === "/admin/settings" ? " is-active" : ""
                }`}
                aria-label="Admin settings"
                aria-current={current === "/admin/settings" ? "page" : undefined}
                style={{ background: current === "/admin/settings" ? "var(--color-bg-elevated)" : "transparent" }}
              >
                <span className="workspace-profile-icon">
                  <Settings size={17} aria-hidden="true" />
                </span>
                <span>Settings</span>
              </Link>
            )}

            <Link
              href="/profile"
              className={`workspace-profile${
                current === "/profile" ? " is-active" : ""
              }`}
              aria-label={`${userId}'s profile`}
              aria-current={current === "/profile" ? "page" : undefined}
            >
              <span className="workspace-profile-icon">
                <UserRound size={17} aria-hidden="true" />
              </span>
              <span style={{ textTransform: "capitalize" }}>{userId}</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="workspace-main" tabIndex={-1}>
        {children}
      </main>

      <footer className="workspace-footer">
        <span>Cyber Box</span>
      </footer>
    </div>
  );
}
