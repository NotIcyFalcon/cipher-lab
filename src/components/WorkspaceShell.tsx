import type { ReactNode } from "react";
import Link from "next/link";
import { Box } from "lucide-react";
import SiteNav from "@/components/ui/SiteNav";
import PageTransition from "@/components/ui/PageTransition";

export default function WorkspaceShell({
  current,
  userId,
  children,
}: {
  current: string;
  userId: string;
  children: ReactNode;
}) {
  return (
    // workspace-frame stays for older page styles that are scoped under it.
    <div className="ui-shell workspace-frame">
      <a href="#main-content" className="ui-skip-link">
        Skip to content
      </a>

      <SiteNav current={current} userId={userId} />

      <main id="main-content" className="ui-main" tabIndex={-1}>
        <PageTransition>{children}</PageTransition>
      </main>

      <footer className="ui-footer">
        <div className="ui-footer-inner">
          <Link href="/dashboard" className="ui-brand ui-brand-footer" aria-label="Cyber Box home">
            <span className="ui-brand-mark" aria-hidden="true">
              <Box size={16} strokeWidth={1.8} />
            </span>
            <span className="ui-brand-word">
              Cyber <span>Box</span>
            </span>
          </Link>
          <p className="ui-footer-tag">Hands-on security learning · labs · homework · CTF</p>
          <nav className="ui-footer-links" aria-label="Footer">
            <Link href="/paths">Learning paths</Link>
            <Link href="/homework">Homework</Link>
            <Link href="/ctf">CTF</Link>
            <Link href="/profile">Profile</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
