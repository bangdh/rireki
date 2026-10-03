import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { LangSwitch } from "@/components/LangSwitch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { initials } from "@/lib/auth-schemas";
import { getTenant, tenantDomain } from "@/lib/tenant";

export type Branding = { name: string; domain: string; initials: string; legalName: string };

/** Workspace header of app/login.html from the current tenant. */
export async function tenantBranding(): Promise<Branding> {
  const tenant = await getTenant();
  return { name: tenant.name, domain: tenantDomain(tenant.slug), initials: initials(tenant.name), legalName: tenant.settings.nameEn ?? tenant.name };
}

/** Two-column auth layout of app/login.html shared by login, forgot, reset and invitation pages; `tenant` null = root domain. */
export async function AuthFrame({ tenant, children }: { tenant: Branding | null; children: ReactNode }) {
  const t = await getTranslations();
  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="row-nowrap">
          <div className="brand-mark">履</div>
          <div>
            <div className="brand-name">Rireki</div>
            <div className="brand-sub" style={{ opacity: ".8" }}>履歴書クラウド</div>
          </div>
        </div>
        <div>
          <h2>{t("auth.side_title")}</h2>
          <ul>
            <li><Icon name="check-circle" /><span>{t("auth.side_1")}</span></li>
            <li><Icon name="check-circle" /><span>{t("auth.side_2")}</span></li>
            <li><Icon name="check-circle" /><span>{t("auth.side_3")}</span></li>
          </ul>
        </div>
        <div className="small" style={{ opacity: ".7" }}>© 2026 Rireki{tenant && <> · <span>{t("auth.tenant_of")}</span> {tenant.legalName}</>}</div>
      </aside>
      <main className="auth-main">
        <div className="top">
          {tenant ? (
            <div className="row-nowrap">
              <span className="avatar">{tenant.initials}</span>
              <div>
                <div className="strong">{tenant.name}</div>
                <div className="mono faint">{tenant.domain}</div>
              </div>
            </div>
          ) : (
            <span />
          )}
          <div className="row-nowrap">
            <LangSwitch />
            <ThemeToggle />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
