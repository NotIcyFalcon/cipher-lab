import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, Box, Flag, LayoutDashboard } from "lucide-react";

const navigation = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/paths", label: "Learning paths", Icon: BookOpen },
  { href: "/homework", label: "Homework", Icon: Box },
  { href: "/ctf", label: "CTF", Icon: Flag },
];

export default function WorkspaceShell({
  current,
  children,
}: {
  current: "/dashboard" | "/paths" | "/homework" | "/ctf";
  children: ReactNode;
}) {
  return (
    <div className="app-shell workspace-shell">
      <a href="#main-content" className="skip-link">Skip to content</a>

      <aside className="sidebar">
        <Link href="/dashboard" className="brand" aria-label="Cyber Box home">
          <span className="brand-icon">
            <Box size={22} aria-hidden="true" />
          </span>
          <span>Cyber <span className="accent">Box</span></span>
        </Link>

        <div className="workspace-label">YOUR LEARNING SPACE</div>

        <nav className="lesson-navigation" aria-label="Main navigation">
          {navigation.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`lesson-link${current === href ? " active" : ""}`}
              aria-current={current === href ? "page" : undefined}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="avatar" aria-hidden="true">R</span>
          <div>
            <strong>Ronak</strong>
            <small>One discovery at a time.</small>
          </div>
        </div>
      </aside>

      <main id="main-content" className="main" tabIndex={-1}>
        <header className="topbar">
          <div className="breadcrumb">
            <span>
              {current === "/dashboard"
                ? "Dashboard"
                : current === "/paths"
                  ? "Learning paths"
                  : current === "/homework"
                    ? "Homework"
                    : "CTF"}
            </span>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
