import type { ReactNode } from "react";
import WorkspaceShell from "@/components/WorkspaceShell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function CTFLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <WorkspaceShell current="/ctf">{children}</WorkspaceShell>;
}
