import { getTranslations } from "next-intl/server";
import { Icon } from "../Icon";
import { NavLink } from "./NavLink";

export type ShellData = {
  tenant: { name: string; domain: string; initials: string };
  user: { name: string; email: string; initials: string; role: "admin" | "user" };
  counts: { candidates: number; shares: number; videoGb: number };
};

export async function Sidebar({ tenant, user, counts }: ShellData) {
  const t = await getTranslations();
  return (
    <aside className="sidebar" id="sidebar" aria-label="Main navigation">
      <div className="brand">
        <div className="brand-mark">履</div>
        <div>
          <div className="brand-name">Rireki</div>
          <div className="brand-sub">履歴書クラウド</div>
        </div>
      </div>
      <div className="tenant">
        <span className="avatar">{tenant.initials}</span>
        <div className="grow">
          <div className="tenant-name truncate">{tenant.name}</div>
          <div className="tenant-domain truncate">{tenant.domain}</div>
        </div>
      </div>
      <nav className="nav">
        <NavLink href="/dashboard"><Icon name="home" /><span>{t("nav.dashboard")}</span></NavLink>
        <NavLink href="/candidates"><Icon name="users" /><span>{t("nav.candidates")}</span><span className="count">{counts.candidates}</span></NavLink>
        <NavLink href="/shares"><Icon name="link" /><span>{t("nav.shares")}</span><span className="count">{counts.shares}</span></NavLink>
      </nav>
      <div className="nav-group eyebrow">{t("nav.manage")}</div>
      <nav className="nav">
        <NavLink href="/settings/members"><Icon name="user-check" /><span>{t("nav.members")}</span></NavLink>
        <NavLink href="/settings/company"><Icon name="settings" /><span>{t("nav.settings")}</span></NavLink>
        <NavLink href="/settings/audit"><Icon name="list" /><span>{t("nav.audit")}</span></NavLink>
      </nav>
      <div className="sidebar-foot">
        <div className="usage">
          <div className="row between"><span className="strong">{t("nav.free_phase")}</span><span className="faint nums">{counts.candidates}</span></div>
          <span className="faint"><span>{t("common.candidates_lc")}</span> · {counts.videoGb} GB <span>{t("nav.video_lc")}</span></span>
        </div>
        <div className="me">
          <span className="avatar">{user.initials}</span>
          <div>
            <div className="name">{user.name}</div>
            <div className="role">{t(`role.${user.role}`)}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
