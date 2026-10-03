"use client";

import type { LinkDefaults, ShareSection } from "@rireki/shared";
import { addDays, format } from "date-fns";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import { PasswordInput } from "@/components/PasswordInput";
import { LANGS } from "@/i18n/config";
import type { LinkFormValues } from "@/lib/shares/form";
import { generateLinkPassword, passwordRequired } from "@/lib/shares/link";

type Props = {
  initial: LinkFormValues;
  defaults: LinkDefaults;
  errors?: Record<string, string>;
  clients: string[];
  candidateCount: number;
  job?: string;
  /** Back / Create (wizard) or Cancel / Save (edit page) buttons of the summary card. */
  footer: ReactNode;
  mode: "create" | "edit";
};

const SECTION_LABEL = { photo: "form.photo", contact: "sharenew.sec_contact", family: "form.family", health: "form.health", videos: "form.videos", documents: "sharenew.sec_docs", feedback: "sharenew.sec_interested" } as const;
const normalizeDomain = (s: string) => s.trim().toLowerCase().replace(/^@/, "");

/**
 * Step 2 of app/share-new.html (also /shares/[id]/edit): the link & client, access, permission, expiry and section
 * cards plus the summary aside. Rendered inside the parent's <form action>; every input has a name for the
 * Server Action, *Locked tenant defaults render disabled (and are enforced server-side anyway).
 */
export function LinkSettingsFields({ initial, defaults, errors = {}, clients, candidateCount, job, footer, mode }: Props) {
  const t = useTranslations();
  const [v, setV] = useState(initial);
  const [domain, setDomain] = useState("");
  const set = <K extends keyof LinkFormValues>(key: K, value: LinkFormValues[K]) => setV((s) => ({ ...s, [key]: value }));
  const setSection = (s: ShareSection, on: boolean) => setV((st) => ({ ...st, sections: { ...st.sections, [s]: on } }));
  const addDomain = () => {
    const d = normalizeDomain(domain);
    if (d && !v.allowedDomains.includes(d)) set("allowedDomains", [...v.allowedDomains, d]);
    setDomain("");
  };
  const pwLocked = passwordRequired(defaults);
  const identityLocked = defaults.identity && defaults.identityLocked;
  const viewOnlyLocked = defaults.viewOnly && defaults.viewOnlyLocked;
  const hidden = (Object.keys(SECTION_LABEL) as ShareSection[]).filter((s) => !v.sections[s]);
  const err = (field: string) => errors[field] && <span className="error-text">{errors[field]}</span>;
  const cls = (field: string, base = "input") => (errors[field] ? `${base} is-error` : base);

  return (
    <div className="grid grid-main-aside">
      <div className="stack">
        <section className="card">
          <div className="card-header"><h3>{t("sharenew.basics")}</h3></div>
          <div className="card-body form-grid">
            <div className="field span-2">
              <label className="label" htmlFor="name"><span>{t("shares.link_name")}</span><span className="req">*</span></label>
              <input id="name" name="name" className={cls("name")} value={v.name} onChange={(e) => set("name", e.target.value)} />
              {err("name")}
            </div>
            <div className="field">
              <label className="label" htmlFor="clientCompany">{t("sharenew.client_company")}</label>
              <input id="clientCompany" name="clientCompany" className={cls("clientCompany")} list="clients" value={v.clientCompany} onChange={(e) => set("clientCompany", e.target.value)} />
              <datalist id="clients">{clients.map((c) => <option key={c}>{c}</option>)}</datalist>
              {err("clientCompany")}
            </div>
            <div className="field">
              <label className="label" htmlFor="clientName">{t("sharenew.client_contact")}</label>
              <input id="clientName" name="clientName" className={cls("clientName")} value={v.clientName} onChange={(e) => set("clientName", e.target.value)} />
              {err("clientName")}
            </div>
            <div className="field">
              <label className="label" htmlFor="clientEmail">{t("sharenew.client_email")}</label>
              <input id="clientEmail" name="clientEmail" className={cls("clientEmail")} type="email" value={v.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} />
              {err("clientEmail")}
            </div>
            <div className="field">
              <label className="label" htmlFor="viewerLang">{t("sharenew.viewer_lang")}</label>
              <select id="viewerLang" name="viewerLang" className="select" value={v.viewerLang} onChange={(e) => set("viewerLang", e.target.value)}>
                {LANGS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </div>
            <div className="field span-2">
              <label className="label" htmlFor="message">{t("sharenew.message")}</label>
              <textarea id="message" name="message" className={cls("message", "textarea")} style={{ minHeight: "70px" }} value={v.message} onChange={(e) => set("message", e.target.value)} />
              {err("message")}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header"><h3>{t("sharenew.access")}</h3></div>
          <div className="card-body stack-lg">
            <div className="row between" style={{ alignItems: "flex-start", gap: "16px" }}>
              <div><b>{t("sharenew.pw_t")}</b><p className="hint">{t("sharenew.pw_d")}</p></div>
              <label className="switch">
                <input type="checkbox" name="passwordEnabled" checked={v.passwordEnabled} disabled={pwLocked} onChange={(e) => set("passwordEnabled", e.target.checked)} />
                <span className="track"></span>
              </label>
              {pwLocked && <input type="hidden" name="passwordEnabled" value="on" />}
            </div>
            {v.passwordEnabled && (
              <div className="field" style={{ maxWidth: "480px" }}>
                <div className="row">
                  <div className="grow">
                    <PasswordInput id="password" name="password" className={cls("password", "input mono")} value={v.password} onChange={(e) => set("password", e.target.value)} defaultShown placeholder={mode === "edit" ? "••••-••••-•••" : undefined} autoComplete="off" style={{ paddingLeft: "12px", paddingRight: "76px" }}>
                      <CopyButton className="btn btn-ghost btn-icon btn-sm" aria-label={t("common.copy_password")} text={v.password}><Icon name="copy" /></CopyButton>
                    </PasswordInput>
                  </div>
                  <button className="btn" type="button" onClick={() => set("password", generateLinkPassword())}><Icon name="refresh" /><span>{t("sharenew.regenerate")}</span></button>
                </div>
                {err("password")}
              </div>
            )}
            <hr style={{ border: "0", borderTop: "1px solid var(--border)", margin: "0" }} />
            <div className="row between" style={{ alignItems: "flex-start", gap: "16px" }}>
              <div><b>{t("sharenew.identity_t")}</b><p className="hint">{t("sharenew.identity_d")}</p></div>
              <label className="switch">
                <input type="checkbox" name="requireIdentity" checked={v.requireIdentity} disabled={identityLocked} onChange={(e) => set("requireIdentity", e.target.checked)} />
                <span className="track"></span>
              </label>
              {identityLocked && <input type="hidden" name="requireIdentity" value="on" />}
            </div>
            <div className="field" style={{ maxWidth: "480px" }}>
              <label className="label" htmlFor="domain">{t("sharenew.domains")}</label>
              <div className="row">
                {v.allowedDomains.map((d) => (
                  <span key={d} className="chip">
                    @{d}
                    <input type="hidden" name="allowedDomains" value={d} />
                    <button type="button" aria-label="Remove" onClick={() => set("allowedDomains", v.allowedDomains.filter((x) => x !== d))}><Icon name="x" className="ic-sm" /></button>
                  </span>
                ))}
                <input
                  id="domain"
                  className={cls("allowedDomains", "input input-sm")}
                  placeholder="@example.co.jp"
                  style={{ width: "180px" }}
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onBlur={addDomain}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "," || e.key === " ") {
                      e.preventDefault();
                      addDomain();
                    }
                  }}
                />
              </div>
              {err("allowedDomains")}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header"><h3>{t("sharenew.permissions")}</h3></div>
          <div className="card-body stack">
            <div className="radio-cards">
              <label className="radio-card">
                <input type="radio" name="downloadAllowed" value="false" checked={!v.downloadAllowed} onChange={() => set("downloadAllowed", false)} />
                <div>
                  <div className="t"><span>{t("sharenew.viewonly_t")}</span> <span className="badge badge-primary">{t("common.recommended")}</span></div>
                  <div className="d">{t("sharenew.viewonly_d")}</div>
                </div>
              </label>
              <label className="radio-card" style={viewOnlyLocked ? { opacity: ".6", cursor: "not-allowed" } : undefined}>
                <input type="radio" name="downloadAllowed" value="true" checked={v.downloadAllowed} disabled={viewOnlyLocked} onChange={() => set("downloadAllowed", true)} />
                <div>
                  <div className="t">{t("sharenew.download_t")}</div>
                  <div className="d">{t("sharenew.download_d")}</div>
                </div>
              </label>
            </div>
            <div className="callout callout-warning"><Icon name="camera-off" /><div>{t("sharenew.capture_note")}</div></div>
          </div>
        </section>

        <section className="card">
          <div className="card-header"><h3>{t("sharenew.expiry")}</h3></div>
          <div className="card-body form-grid">
            <div className="field">
              <label className="label" htmlFor="expiresAt">{t("sharenew.expires_on")}</label>
              <input id="expiresAt" name="expiresAt" className={cls("expiresAt")} type="date" value={v.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
              <div className="row mt-8" style={{ gap: "6px" }}>
                {[7, 14, 30].map((d) => (
                  <button key={d} className={v.expiresAt === format(addDays(new Date(), d), "yyyy-MM-dd") ? "filter-chip active" : "filter-chip"} type="button" onClick={() => set("expiresAt", format(addDays(new Date(), d), "yyyy-MM-dd"))}>
                    {d} <span>{t("common.days")}</span>
                  </button>
                ))}
                <button className={v.expiresAt === "" ? "filter-chip active" : "filter-chip"} type="button" onClick={() => set("expiresAt", "")}>{t("sharenew.no_expiry")}</button>
              </div>
              {err("expiresAt")}
            </div>
            <div className="field">
              <label className="label" htmlFor="maxViews">{t("sharenew.max_views")}</label>
              <input id="maxViews" name="maxViews" className={cls("maxViews")} type="number" min="1" placeholder={t("common.unlimited")} value={v.maxViews} onChange={(e) => set("maxViews", e.target.value)} />
              <span className="hint">{t("sharenew.max_views_hint")}</span>
              {err("maxViews")}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header"><h3>{t("sharenew.sections")}</h3></div>
          <div className="card-body grid grid-2" style={{ gap: "12px" }}>
            {(Object.keys(SECTION_LABEL) as ShareSection[]).map((s) => (
              <label key={s} className="switch">
                <input type="checkbox" name={`sections.${s}`} checked={v.sections[s]} onChange={(e) => setSection(s, e.target.checked)} />
                <span className="track"></span>
                <span>
                  <span>{t(SECTION_LABEL[s])}</span>
                  {s === "contact" && <> <span className="hint">{t("sharenew.sec_contact_hint")}</span></>}
                </span>
              </label>
            ))}
            <label className="switch">
              <input type="checkbox" name="notify" checked={v.notify} onChange={(e) => set("notify", e.target.checked)} />
              <span className="track"></span>
              <span>{t("sharenew.sec_notify")}</span>
            </label>
          </div>
        </section>
      </div>

      <aside>
        <div className="card sticky-aside">
          <div className="card-header"><h3>{t("common.summary")}</h3></div>
          <div className="card-body stack" style={{ gap: "10px" }}>
            <dl className="kv">
              <dt>{t("cand.title")}</dt><dd>{candidateCount}{job && ` · ${job}`}</dd>
              <dt>{t("shares.client")}</dt><dd>{v.clientCompany || "—"}</dd>
              <dt>{t("sharenew.access")}</dt>
              <dd>{[v.passwordEnabled && t("shares.password"), v.requireIdentity && t("sharenew.identity_short")].filter(Boolean).join(" + ") || t("shares.no_password")}</dd>
              <dt>{t("shares.protection")}</dt>
              <dd>{v.downloadAllowed ? <span className="badge badge-info"><Icon name="download" /><span>{t("shares.download_allowed")}</span></span> : <span className="badge badge-warning"><Icon name="eye" /><span>{t("shares.view_only")}</span></span>}</dd>
              <dt>{t("common.expires")}</dt><dd>{v.expiresAt || t("sharenew.no_expiry")}</dd>
              <dt>{t("sharenew.hidden")}</dt><dd>{hidden.length ? hidden.map((s) => t(SECTION_LABEL[s])).join(", ") : t("common.none")}</dd>
            </dl>
            {errors.form && <span className="error-text">{errors.form}</span>}
          </div>
          <div className="card-footer between">{footer}</div>
        </div>
      </aside>
    </div>
  );
}
