import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "../Icon";
import { LangSwitch } from "../LangSwitch";
import { Menu } from "../Menu";
import { ThemeToggle } from "../ThemeToggle";
import { NavToggle } from "./NavToggle";
import type { ShellData } from "./Sidebar";
import { SignOutButton } from "./SignOutButton";

export async function Topbar({ user }: Pick<ShellData, "user">) {
  const t = await getTranslations();
  return (
    <header className="topbar">
      <NavToggle />
      {/* plain GET search: the candidates page reads ?q= (TODO(candidates): filter by q) */}
      <form className="search input-wrap" action="/candidates" role="search">
        <Icon name="search" />
        <input className="input input-sm" name="q" placeholder={t("nav.search")} />
      </form>
      <div className="spacer"></div>
      <LangSwitch />
      <ThemeToggle />
      <button className="btn btn-ghost btn-icon" type="button" aria-label="Notifications" style={{ position: "relative" }}>
        <Icon name="bell" />
        <span style={{ position: "absolute", top: 7, right: 8, width: 7, height: 7, borderRadius: "50%", background: "var(--vermilion)" }}></span>
      </button>
      <Menu>
        <summary className="btn btn-ghost" style={{ padding: "0 6px" }}>
          <span className="avatar avatar-sm">{user.initials}</span>
          <Icon name="chev-down" className="ic-sm" />
        </summary>
        <div className="menu-list">
          <div className="menu-head">{user.email}</div>
          <a href="#"><Icon name="user" /><span>{t("nav.profile")}</span></a>
          <Link href="/settings/company"><Icon name="settings" /><span>{t("nav.settings")}</span></Link>
          <hr />
          <SignOutButton><Icon name="logout" /><span>{t("nav.logout")}</span></SignOutButton>
        </div>
      </Menu>
    </header>
  );
}
