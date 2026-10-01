import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LangSwitch } from "@/components/LangSwitch";
import { PasswordInput } from "@/components/PasswordInput";
import { ThemeToggle } from "@/components/ThemeToggle";

// public/signup.html — creates the organization + first admin.
// TODO(auth-tenant): Server Action (better-auth signUpEmail + organization.create + TenantSettings), zod field errors,
// subdomain suggested from the company name (data-subdomain-source in assets/app.js), redirect to https://{slug}.{domain}/login.
export default async function SignupPage() {
  const t = await getTranslations();
  return (
    <div className="auth">
      <aside className="auth-side">
        <Link className="row-nowrap" href="/" style={{ color: "inherit" }}>
          <div className="brand-mark">履</div>
          <div>
            <div className="brand-name">Rireki</div>
            <div className="brand-sub" style={{ opacity: ".8" }}>履歴書クラウド</div>
          </div>
        </Link>
        <div>
          <h2>{t("signup.side_title")}</h2>
          <ul>
            <li><Icon name="check-circle" /><span>{t("signup.side_1")}</span></li>
            <li><Icon name="check-circle" /><span>{t("signup.side_2")}</span></li>
            <li><Icon name="check-circle" /><span>{t("signup.side_3")}</span></li>
          </ul>
        </div>
        <div className="small" style={{ opacity: ".7" }}>{t("signup.side_quote")}</div>
      </aside>
      <main className="auth-main">
        <div className="top">
          <Link className="btn btn-ghost btn-sm" href="/"><Icon name="arrow-left" />rireki.app</Link>
          <div className="row-nowrap">
            <LangSwitch />
            <ThemeToggle />
          </div>
        </div>
        <form className="auth-card" style={{ maxWidth: "520px" }}>
          <div>
            <h1>{t("signup.title")}</h1>
            <p className="muted mt-8">{t("signup.sub")}</p>
          </div>
          <div className="form-grid">
            <div className="field span-2">
              <label className="label" htmlFor="cname"><span>{t("signup.company")}</span><span className="req">*</span></label>
              <input id="cname" name="company" className="input" placeholder="Sao Việt Manpower JSC" required />
            </div>
            <div className="field">
              <label className="label" htmlFor="country"><span>{t("signup.country")}</span><span className="req">*</span></label>
              <select id="country" name="country" className="select">
                <option value="VN">🇻🇳 Vietnam</option><option value="MM">🇲🇲 Myanmar</option><option value="BD">🇧🇩 Bangladesh</option><option value="ID">🇮🇩 Indonesia</option><option value="other">{t("common.other")}</option>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="lang">{t("signup.language")}</label>
              <select id="lang" name="lang" className="select">
                <option value="vi">Tiếng Việt</option><option value="en">English</option><option value="ja">日本語</option><option value="my">မြန်မာ</option><option value="id">Bahasa Indonesia</option>
              </select>
            </div>
            <div className="field span-2">
              <label className="label" htmlFor="sub"><span>{t("signup.subdomain")}</span><span className="req">*</span></label>
              <div className="input-group"><input id="sub" name="slug" className="input mono" placeholder="saoviet" pattern="[a-z0-9-]{3,24}" required /><span className="addon">.rireki.app</span></div>
              <span className="hint" id="subHint">{t("signup.subdomain_hint")}</span>
            </div>
            <div className="field">
              <label className="label" htmlFor="aname"><span>{t("signup.admin_name")}</span><span className="req">*</span></label>
              <input id="aname" name="name" className="input" placeholder="Nguyễn Thị Hương" required />
            </div>
            <div className="field">
              <label className="label" htmlFor="amail"><span>{t("auth.email")}</span><span className="req">*</span></label>
              <input id="amail" name="email" className="input" type="email" placeholder="huong@saoviet.vn" required />
            </div>
            <div className="field span-2">
              <label className="label" htmlFor="apw"><span>{t("auth.password")}</span><span className="req">*</span></label>
              <PasswordInput id="apw" name="password" className="input" minLength={10} required style={{ paddingLeft: "12px", paddingRight: "40px" }} />
              <span className="hint">{t("signup.pw_hint")}</span>
            </div>
          </div>
          <label className="check">
            <input type="checkbox" name="agree" required />
            <span><span>{t("signup.agree")}</span> <a href="#">{t("landing.terms")}</a> <span>{t("common.and")}</span> <a href="#">{t("landing.privacy")}</a>, <span>{t("signup.agree2")}</span></span>
          </label>
          <button className="btn btn-primary btn-lg btn-block" type="submit">{t("signup.create")}</button>
          <p className="small muted center"><span>{t("signup.have_account")}</span> <Link href="/login">{t("landing.login")}</Link></p>
        </form>
      </main>
    </div>
  );
}
