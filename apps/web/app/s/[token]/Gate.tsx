import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { PasswordInput } from "@/components/PasswordInput";
import { StaticForm } from "@/components/StaticForm";
import { LINK, TENANT } from "@/lib/sample";
import { ViewerTop } from "./ViewerChrome";

// viewer/gate.html — password + identity gate. TODO(share-viewer): Server Action: verify password (argon2), identity +
// allowed domains, rate limit 5/15min (Redis), upsert Viewer, set cookie rv_{token}, log `unlock` / `failed_password`.
export async function Gate() {
  const t = await getTranslations();
  return (
    <div className="auth" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
      <main className="auth-main">
        <ViewerTop />
        <StaticForm className="auth-card">
          <div className="stack" style={{ gap: "6px" }}>
            <span className="eyebrow">{t("viewer.invited")}</span>
            <h1>{LINK.name}</h1>
            <p className="muted">
              {LINK.candidateCount} <span>{t("common.candidates_lc")}</span> · <span>{t("viewer.from")}</span> {TENANT.name} · <span>{t("viewer.valid_until")}</span> {LINK.expiresJa}
            </p>
          </div>
          <div className="card" style={{ background: "var(--surface-2)", boxShadow: "none" }}>
            <div className="card-body" style={{ padding: "14px", fontSize: "13.5px", lineHeight: "1.7" }}>
              {LINK.message}
              <div className="small muted mt-8">— {TENANT.contact.name}, {TENANT.name}</div>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="vpw"><span>{t("viewer.password")}</span> <span className="hint" style={{ fontWeight: "400" }}>{t("viewer.password_hint")}</span></label>
            <PasswordInput id="vpw" name="password" icon="key" className="input" placeholder="••••-••••-•••" style={{ paddingRight: "40px" }} />
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="vname"><span>{t("viewer.your_name")}</span><span className="req">*</span></label>
              <input id="vname" name="name" className="input" placeholder="田中 健一" required />
            </div>
            <div className="field">
              <label className="label" htmlFor="vmail"><span>{t("viewer.your_email")}</span><span className="req">*</span></label>
              <input id="vmail" name="email" className="input" type="email" placeholder="tanaka@yamato-k.co.jp" required />
              <span className="hint">{LINK.domains.join(", ")}</span>
            </div>
          </div>
          <button className="btn btn-primary btn-lg btn-block" type="submit"><Icon name="unlock" /><span>{t("viewer.open")}</span></button>
          <div className="callout small">
            <Icon name="eye" />
            <div><b>{t("viewer.viewonly_t")}</b><br /><span>{t("viewer.viewonly_d")}</span></div>
          </div>
          <p className="xs faint center"><span>{t("viewer.terms")}</span></p>
        </StaticForm>
        <div className="center xs faint">{TENANT.legalName} · Hà Nội · {TENANT.contact.phone} · <span>{t("viewer.powered")}</span> Rireki</div>
      </main>
    </div>
  );
}
