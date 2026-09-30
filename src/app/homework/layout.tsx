import Link from "next/link";
import type { ReactNode } from "react";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import { BookOpen, Box, LayoutDashboard } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomeworkLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userId = await requireRonakId();
  const progress = getProgress(userId);

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
          <Link href="/dashboard" className="lesson-link">
            <LayoutDashboard size={17} aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
          <Link href="/paths" className="lesson-link">
            <BookOpen size={17} aria-hidden="true" />
            <span>Learning paths</span>
          </Link>
          <Link href="/homework" className="lesson-link active" aria-current="page">
            <Box size={17} aria-hidden="true" />
            <span>Homework</span>
          </Link>
        </nav>

        <div className="sidebar-progress">
          <div className="icon-label">
            <strong className="accent">{progress.totalXp} XP collected</strong>
          </div>
          <p>Ronak&apos;s learning progress</p>
          <small>Saved to your account.</small>
        </div>
      </aside>

      <main id="main-content" className="main">{children}</main>
    </div>
  );
}
