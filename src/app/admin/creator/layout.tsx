import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { requireUserId } from "@/server/current-user";
import "./creator.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CreatorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userId = await requireUserId();

  if (userId !== "admin") {
    return (
      <WorkspaceShell current="/admin/creator" userId={userId}>
        <div className="dashboard-empty">
          <ShieldAlert size={40} aria-hidden="true" />
          <h2>Access Denied</h2>
          <p>You must be an administrator to access the Creator&apos;s Column.</p>
          <Link href="/dashboard" className="secondary-button">
            Back to dashboard
          </Link>
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell current="/admin/creator" userId={userId}>
      {children}
    </WorkspaceShell>
  );
}
