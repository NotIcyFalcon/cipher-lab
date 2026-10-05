import type { Metadata } from "next";
import WorkspaceShell from "@/components/WorkspaceShell";
import DashboardShowcase from "@/components/showcase/DashboardShowcase";
import { pathHref } from "@/lib/path-links";
import { requireRonakId } from "@/server/current-user";
import { getProfileDashboard } from "@/server/profile";
import "@/styles/pages/showcase.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cyber Box — Cyber Security in a Box",
  description: "Hands-on security learning: Linux, networking, web and DevOps.",
};

export default async function DashboardPage() {
  const userId = await requireRonakId();
  const profile = getProfileDashboard(userId);

  // The next path to work on: something in progress, else the first untouched one.
  const next = profile.pathProgress.find((path) => !path.complete);

  return (
    <WorkspaceShell current="/dashboard" userId={userId} immersive>
      <noscript>
        <style>{`.sc [data-intro]{opacity:1!important}.sc-boot{display:none!important}.ui-shell.is-immersive .ui-nav{transform:none!important}`}</style>
      </noscript>
      <DashboardShowcase
        data={{
          operator: userId.charAt(0).toUpperCase() + userId.slice(1),
          level: profile.level,
          totalXp: profile.totalXp,
          streak: profile.currentStreak,
          nextTarget: next ? { title: next.title, href: pathHref(next.id) } : null,
        }}
      />
    </WorkspaceShell>
  );
}
