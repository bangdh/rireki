import { prisma } from "@rireki/db";
import type { ReactNode } from "react";
import { initials } from "@/lib/auth-schemas";
import { requireMember, tenantDomain } from "@/lib/tenant";
import { storageGb } from "@/lib/usage";
import { Scrim } from "./NavToggle";
import { Sidebar, type ShellData } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * Tenant app shell (sidebar + topbar) — the layout of /dashboard, /candidates, /shares and /settings, re-exported from
 * each section's layout.tsx so /login stays outside it. Pages render their own <main className="main" id="main">.
 * requireMember() sends visitors without a session to /login and non-members to /login?error=no_access.
 */
export default async function AppShell({ children }: { children: ReactNode }) {
  const { tenant, user, role } = await requireMember();
  const [candidates, shares, videoGb] = await Promise.all([
    prisma.candidate.count({ where: { tenantId: tenant.id, archivedAt: null } }),
    prisma.shareLink.count({ where: { tenantId: tenant.id, status: "active" } }),
    storageGb(tenant.id),
  ]);
  const data: ShellData = {
    tenant: { name: tenant.name, domain: tenantDomain(tenant.slug), initials: initials(tenant.name) },
    user: { name: user.name, email: user.email, initials: initials(user.name), role },
    counts: { candidates, shares, videoGb },
  };
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className="app">
        <Sidebar {...data} />
        <div className="app-main">
          <Topbar user={data.user} />
          {children}
        </div>
      </div>
      <Scrim />
    </>
  );
}
