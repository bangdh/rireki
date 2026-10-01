import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import AppShell from "@/components/shell/AppShell";
import { NavLink } from "@/components/shell/NavLink";

// Settings = the tenant shell + the page header and sub-navigation shared by every /settings/* page
// (app/settings-company.html tabs are routes here: company, members, branding, security, usage, audit — as in the sitemap).
// TODO(auth-tenant): requireRole("admin") for every settings page.
const NAV = [
  ["company", "building", "settings.company"],
  ["members", "users", "nav.members"],
  ["branding", "image", "settings.branding"],
  ["security", "shield", "settings.security"],
  ["usage", "layers", "settings.usage"],
  ["audit", "list", "nav.audit"],
] as const;

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations();
  return (
    <AppShell>
      <main className="main" id="main">
        <div className="page-header">
          <div>
            <h1>{t("nav.settings")}</h1>
            <p className="sub">{t("settings.sub")}</p>
          </div>
        </div>
        <div className="grid grid-aside-main grid-settings">
          <nav className="subnav">
            {NAV.map(([slug, icon, label]) => (
              <NavLink key={slug} href={`/settings/${slug}`}><Icon name={icon} /><span>{t(label)}</span></NavLink>
            ))}
          </nav>
          {children}
        </div>
      </main>
    </AppShell>
  );
}
