import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LangSwitch } from "@/components/LangSwitch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { env } from "@/lib/env";
import { SignupForm } from "./SignupForm";

// public/signup.html — root domain: creates the organization (tenant) and its first admin, then sends the browser to {slug}.{domain}/login.
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
          <Link className="btn btn-ghost btn-sm" href="/"><Icon name="arrow-left" />{env.APP_DOMAIN}</Link>
          <div className="row-nowrap">
            <LangSwitch />
            <ThemeToggle />
          </div>
        </div>
        <SignupForm domain={env.APP_DOMAIN} />
      </main>
    </div>
  );
}
