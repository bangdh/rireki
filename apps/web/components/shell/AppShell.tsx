import type { ReactNode } from "react";
import { ME, TENANT } from "@/lib/sample";
import { Scrim } from "./NavToggle";
import { Sidebar, type ShellData } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * Tenant app shell (sidebar + topbar) — the layout of /dashboard, /candidates, /shares and /settings, re-exported from
 * each section's layout.tsx so /login stays outside it. Pages render their own <main className="main" id="main">.
 */
export default async function AppShell({ children }: { children: ReactNode }) {
  // TODO(auth-tenant): const tenant = await getTenant(); const { user, role } = await requireMember(tenant) (redirect to /login);
  // counts from Prisma scoped by tenantId. Until then the shell shows the mockup's sample workspace.
  const data: ShellData = {
    tenant: { name: TENANT.name, domain: TENANT.domain, initials: TENANT.initials },
    user: ME,
    counts: { candidates: 182, shares: 14, videoGb: 12.4 },
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
