import type { ReactNode } from "react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { requireRonakId } from "@/server/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomeworkLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRonakId();

  return (
    <WorkspaceShell current="/homework">
      {children}
    </WorkspaceShell>
  );
}
