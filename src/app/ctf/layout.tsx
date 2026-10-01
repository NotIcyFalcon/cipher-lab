import type { Metadata } from "next";
import type { ReactNode } from "react";

import WorkspaceShell from "@/components/WorkspaceShell";
import { requireRonakId } from "@/server/current-user";

import "@/app/workspace.css";
import "@/app/batch-four.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CTF Operations | Cyber Box",
  description:
    "Investigate evidence, solve challenges, and capture flags in Cyber Box.",
};

export default async function CTFLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRonakId();

  return (
    <WorkspaceShell current="/ctf">
      <div className="ctf-root">{children}</div>
    </WorkspaceShell>
  );
}
