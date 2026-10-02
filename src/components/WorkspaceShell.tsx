import type { ReactNode } from "react";
import Link from "next/link";
import { Box, UserRound } from "lucide-react";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/paths", label: "Learning Paths" },
  { href: "/homework", label: "Homework" },
  { href: "/ctf", label: "CTF" },
  { href: "/profile", label: "Profile" },
] as const;

type WorkspaceRoute = (typeof navigation)[number]["href"];

export default function WorkspaceShell({
  current,
  children,
}: {
  current: WorkspaceRoute;
  children: ReactNode;
}) {
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

          <Link
            href="/profile"
            className={`workspace-profile${
              current === "/profile" ? " is-active" : ""
            }`}
            aria-label="Ronak's profile"
            aria-current={current === "/profile" ? "page" : undefined}
          >
            <span className="workspace-profile-icon">
              <UserRound size={17} aria-hidden="true" />
            </span>
            <span>Ronak</span>
          </Link>
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
