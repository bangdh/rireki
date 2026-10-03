import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { env } from "@/lib/env";
import { tenantSlug } from "@/lib/tenant";
import { findWorkspace } from "./actions";
import { AuthFrame, tenantBranding } from "./AuthFrame";
import { LoginForm } from "./LoginForm";

// app/login.html — per-subdomain sign-in; on the root domain the same layout asks for the workspace address instead.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const t = await getTranslations();
  if (!(await tenantSlug())) {
    return (
      <AuthFrame tenant={null}>
        <form className="auth-card" action={findWorkspace}>
          <div>
            <h1>{t("auth.find_workspace")}</h1>
          </div>
          <div className="field">
            <label className="label" htmlFor="slug">{t("signup.subdomain")}</label>
            <div className="input-group">
              <input id="slug" name="slug" className="input mono" placeholder="saoviet" pattern="[a-z0-9-]{3,24}" required autoFocus />
              <span className="addon">.{env.APP_DOMAIN}</span>
            </div>
            <span className="hint">{t("signup.subdomain_hint")}</span>
          </div>
          <button className="btn btn-primary btn-lg btn-block" type="submit">{t("auth.sign_in")}</button>
          <p className="small muted center"><Link href="/signup">{t("landing.start")}</Link></p>
        </form>
      </AuthFrame>
    );
  }
  const { error } = await searchParams;
  return (
    <AuthFrame tenant={await tenantBranding()}>
      <LoginForm noAccess={error === "no_access"} />
    </AuthFrame>
  );
}
