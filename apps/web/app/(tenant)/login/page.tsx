import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LangSwitch } from "@/components/LangSwitch";
import { PasswordInput } from "@/components/PasswordInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TENANT } from "@/lib/sample";

// app/login.html — per-subdomain sign-in. TODO(auth-tenant): tenant from getTenant(), better-auth sign-in Server Action, field errors.
export default async function LoginPage() {
  const t = await getTranslations();
  const tenant = TENANT;
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
        <div className="small" style={{ opacity: ".7" }}>© 2026 Rireki · <span>{t("auth.tenant_of")}</span> {tenant.legalName}</div>
      </aside>
      <main className="auth-main">
        <div className="top">
          <div className="row-nowrap">
            <span className="avatar">{tenant.initials}</span>
            <div>
              <div className="strong">{tenant.name}</div>
              <div className="mono faint">{tenant.domain}</div>
            </div>
          </div>
          <div className="row-nowrap">
            <LangSwitch />
            <ThemeToggle />
          </div>
        </div>
        <form className="auth-card">
          <div>
            <h1>{t("auth.login_title")}</h1>
            <p className="muted mt-8">{t("auth.login_sub")}</p>
          </div>
          <div className="field">
            <label htmlFor="email">{t("auth.email")}</label>
            <input id="email" name="email" className="input" type="email" autoComplete="username" required />
          </div>
          <div className="field">
            <div className="row between">
              <label htmlFor="pw">{t("auth.password")}</label>
              <a href="#" className="small">{t("auth.forgot")}</a>
            </div>
            <PasswordInput id="pw" name="password" className="input" autoComplete="current-password" required style={{ paddingLeft: "12px", paddingRight: "40px" }} />
          </div>
          <label className="check"><input type="checkbox" name="remember" defaultChecked /><span>{t("auth.remember")}</span></label>
          <button className="btn btn-primary btn-lg btn-block" type="submit">{t("auth.sign_in")}</button>
          <p className="small muted center"><span>{t("auth.not_your_company")}</span> <Link href="/">{t("auth.go_main")}</Link></p>
        </form>
      </main>
    </div>
  );
}
