import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LangSwitch } from "@/components/LangSwitch";
import { Menu } from "@/components/Menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LINK, TENANT, VIEWER } from "@/lib/sample";

// Chrome shared by the client viewer pages (viewer/*.html). TODO(share-viewer): tenant branding + link + viewer from the request.

/** Header of the list and detail pages. */
export async function ViewerHeader({ token, back = false }: { token: string; back?: boolean }) {
  const t = await getTranslations();
  return (
    <header className="viewer-header">
      <div className="container">
        {back && <Link className="btn btn-ghost btn-sm" href={`/s/${token}?preview=list`}><Icon name="arrow-left" /><span>{t("viewer.back")}</span></Link>}
        <div className={back ? "viewer-brand hide-mobile" : "viewer-brand"}>
          <span className="logo">{TENANT.initials}</span>
          <div><div className="n">{TENANT.name}</div><div className="s">{LINK.name}</div></div>
        </div>
        <div className="grow"></div>
        <span className="protected-notice hide-mobile"><Icon name="eye" className="ic-sm" /><span>{t("viewer.viewonly_badge")}</span></span>
        <LangSwitch />
        <ThemeToggle />
        <Menu>
          <summary className="btn btn-ghost" style={{ padding: "0 6px" }}>
            <span className="avatar avatar-sm">{VIEWER.initials}</span>{!back && <span className="hide-mobile small">{VIEWER.name}</span>}
          </summary>
          <div className="menu-list">
            <div className="menu-head">{VIEWER.email}</div>
            {/* TODO(share-viewer): clear the viewer cookie */}
            <Link href={`/s/${token}`}><Icon name="logout" /><span>{t("viewer.close")}</span></Link>
          </div>
        </Menu>
      </div>
    </header>
  );
}

/** Top row of the gate and expired pages (sender branding + language/theme). */
export function ViewerTop() {
  return (
    <div className="top">
      <div className="viewer-brand">
        <span className="logo">{TENANT.initials}</span>
        <div><div className="n">{TENANT.name}</div><div className="s">{TENANT.nameJa}</div></div>
      </div>
      <div className="row-nowrap">
        <LangSwitch />
        <ThemeToggle />
      </div>
    </div>
  );
}

export async function ViewerFooter() {
  const t = await getTranslations();
  return (
    <footer className="site-footer">
      <div className="container row between">
        <span>{TENANT.footer}</span>
        <span><span>{t("viewer.powered")}</span> Rireki</span>
      </div>
    </footer>
  );
}
