import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LangSwitch } from "@/components/LangSwitch";
import { Menu } from "@/components/Menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { initials } from "@/lib/shares/format";
import type { UnlockedViewer, ViewerContext } from "@/lib/shares/viewer";
import { closeViewer } from "./actions";

// Chrome shared by the client viewer pages (viewer/*.html): tenant branding, link and viewer from the request context.

/** Header of the list and detail pages. */
export async function ViewerHeader({ ctx, token, back = false }: { ctx: UnlockedViewer; token: string; back?: boolean }) {
  const t = await getTranslations();
  const { tenant, link, viewer } = ctx;
  const who = viewer.name ?? viewer.email ?? t("track.anonymous");
  return (
    <header className="viewer-header">
      <div className="container">
        {back && <Link className="btn btn-ghost btn-sm" href={`/s/${token}`} prefetch={false}><Icon name="arrow-left" /><span className="hide-mobile">{t("viewer.back")}</span></Link>}
        {/* minWidth 0 + truncate: the brand gives way to the language/theme/viewer controls on a 400px screen */}
        <div className={back ? "viewer-brand hide-mobile" : "viewer-brand"} style={{ minWidth: 0 }}>
          <span className="logo">{initials(tenant.name)}</span>
          <div style={{ minWidth: 0 }}><div className="n truncate">{tenant.name}</div><div className="s truncate">{link.name}</div></div>
        </div>
        <div className="grow"></div>
        {!link.downloadAllowed && <span className="protected-notice hide-mobile"><Icon name="eye" className="ic-sm" /><span>{t("viewer.viewonly_badge")}</span></span>}
        <LangSwitch />
        <ThemeToggle />
        <Menu>
          <summary className="btn btn-ghost" style={{ padding: "0 6px" }}>
            <span className="avatar avatar-sm">{initials(who)}</span>{!back && <span className="hide-mobile small">{who}</span>}
          </summary>
          <div className="menu-list">
            <div className="menu-head">{viewer.email ?? t("track.no_identity")}</div>
            <form action={closeViewer.bind(null, token)}><button type="submit"><Icon name="logout" /><span>{t("viewer.close")}</span></button></form>
          </div>
        </Menu>
      </div>
    </header>
  );
}

/** Top row of the gate and expired pages (sender branding + language/theme). */
export function ViewerTop({ ctx }: { ctx: ViewerContext }) {
  const { tenant } = ctx;
  return (
    <div className="top">
      <div className="viewer-brand">
        <span className="logo">{initials(tenant.name)}</span>
        <div><div className="n">{tenant.name}</div><div className="s">{tenant.settings?.nameJa ?? tenant.settings?.nameEn ?? ""}</div></div>
      </div>
      <div className="row-nowrap">
        <LangSwitch />
        <ThemeToggle />
      </div>
    </div>
  );
}

/** "Sao Việt Manpower JSC · Hà Nội · +84 … · sales@…" from TenantSettings.footer or the organization details. */
export function footerLine(ctx: ViewerContext) {
  const { tenant, creator } = ctx;
  return tenant.settings?.footer || [tenant.settings?.nameEn ?? tenant.name, tenant.meta.address, tenant.meta.phone, creator?.email].filter(Boolean).join(" · ");
}

export async function ViewerFooter({ ctx }: { ctx: ViewerContext }) {
  const t = await getTranslations();
  return (
    <footer className="site-footer">
      <div className="container row between">
        <span>{footerLine(ctx)}</span>
        {ctx.tenant.meta.poweredBy && <span><span>{t("viewer.powered")}</span> Rireki</span>}
      </div>
    </footer>
  );
}
