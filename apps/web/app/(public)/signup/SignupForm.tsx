"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState, useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { LANGS } from "@/i18n/config";
import { suggestSlug } from "@/lib/auth-schemas";
import { signup, type SignupState } from "./actions";

const COUNTRIES = [
  ["VN", "🇻🇳 Vietnam"],
  ["MM", "🇲🇲 Myanmar"],
  ["BD", "🇧🇩 Bangladesh"],
  ["ID", "🇮🇩 Indonesia"],
] as const;

/** The form of public/signup.html: the subdomain mirrors the company name until it is edited by hand (data-subdomain-source). */
export function SignupForm({ domain }: { domain: string }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(signup, {} as SignupState);
  const v = state.values ?? {};
  const [company, setCompany] = useState(v.company ?? "");
  const [slug, setSlug] = useState(v.slug ?? "");
  const [touched, setTouched] = useState(Boolean(v.slug));
  const shownSlug = touched ? slug : suggestSlug(company);
  const error = (field: string) => state.errors?.[field] && <span className="error-text">{state.errors[field]}</span>;

  return (
    <form className="auth-card" style={{ maxWidth: "520px" }} action={formAction}>
      <div>
        <h1>{t("signup.title")}</h1>
        <p className="muted mt-8">{t("signup.sub")}</p>
      </div>
      <div className="form-grid">
        <div className="field span-2">
          <label className="label" htmlFor="cname"><span>{t("signup.company")}</span><span className="req">*</span></label>
          <input id="cname" name="company" className="input" placeholder="Sao Việt Manpower JSC" required value={company} onChange={(e) => setCompany(e.target.value)} />
          {error("company")}
        </div>
        <div className="field">
          <label className="label" htmlFor="country"><span>{t("signup.country")}</span><span className="req">*</span></label>
          <select id="country" name="country" className="select" defaultValue={v.country ?? "VN"}>
            {COUNTRIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            <option value="other">{t("common.other")}</option>
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="lang">{t("signup.language")}</label>
          <select id="lang" name="lang" className="select" defaultValue={v.lang ?? "vi"}>
            {LANGS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </div>
        <div className="field span-2">
          <label className="label" htmlFor="sub"><span>{t("signup.subdomain")}</span><span className="req">*</span></label>
          <div className="input-group">
            <input id="sub" name="slug" className="input mono" placeholder="saoviet" pattern="[a-z0-9-]{3,24}" required value={shownSlug} onChange={(e) => { setTouched(true); setSlug(e.target.value); }} />
            <span className="addon">.{domain}</span>
          </div>
          <span className="hint" id="subHint" style={shownSlug ? { color: "var(--success)" } : undefined}>{shownSlug ? `https://${shownSlug}.${domain}` : t("signup.subdomain_hint")}</span>
          {error("slug")}
        </div>
        <div className="field">
          <label className="label" htmlFor="aname"><span>{t("signup.admin_name")}</span><span className="req">*</span></label>
          <input id="aname" name="name" className="input" placeholder="Nguyễn Thị Hương" required defaultValue={v.name} />
          {error("name")}
        </div>
        <div className="field">
          <label className="label" htmlFor="amail"><span>{t("auth.email")}</span><span className="req">*</span></label>
          <input id="amail" name="email" className="input" type="email" placeholder="huong@saoviet.vn" required defaultValue={v.email} />
          {error("email")}
        </div>
        <div className="field span-2">
          <label className="label" htmlFor="apw"><span>{t("auth.password")}</span><span className="req">*</span></label>
          <PasswordInput id="apw" name="password" className="input" minLength={10} required autoComplete="new-password" style={{ paddingLeft: "12px", paddingRight: "40px" }} />
          <span className="hint">{t("signup.pw_hint")}</span>
          {error("password")}
        </div>
      </div>
      <label className="check">
        <input type="checkbox" name="agree" required defaultChecked={v.agree === "on"} />
        <span><span>{t("signup.agree")}</span> <a href="#">{t("landing.terms")}</a> <span>{t("common.and")}</span> <a href="#">{t("landing.privacy")}</a>, <span>{t("signup.agree2")}</span></span>
      </label>
      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={pending}>{t("signup.create")}</button>
      <p className="small muted center"><span>{t("signup.have_account")}</span> <Link href="/login">{t("landing.login")}</Link></p>
    </form>
  );
}
