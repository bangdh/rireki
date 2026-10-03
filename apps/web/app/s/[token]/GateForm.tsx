"use client";

import { useTranslations } from "next-intl";
import { useActionState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { PasswordInput } from "@/components/PasswordInput";
import { unlock, type GateState } from "./actions";

type Props = {
  token: string;
  needsPassword: boolean;
  needsIdentity: boolean;
  domains: string[];
  /** server-rendered intro (eyebrow, link name, message) and trailer (view-only callout, terms) */
  header: ReactNode;
  footer: ReactNode;
};

/** The gate form of viewer/gate.html → unlock(); only the fields the link needs, errors as error-text under them. */
export function GateForm({ token, needsPassword, needsIdentity, domains, header, footer }: Props) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<GateState, FormData>(unlock.bind(null, token), null);
  const error = state?.error;
  const message = error === "locked" ? t("auth.err_locked") : t("track.a_failed");
  return (
    <form className="auth-card" action={action}>
      {header}
      {error === "locked" && (
        <div className="callout callout-danger" role="alert">
          <Icon name="alert" />
          <div>{message}</div>
        </div>
      )}
      {needsPassword && (
        <div className="field">
          <label className="label" htmlFor="vpw"><span>{t("viewer.password")}</span> <span className="hint" style={{ fontWeight: "400" }}>{t("viewer.password_hint")}</span></label>
          <PasswordInput id="vpw" name="password" icon="key" className={error === "password" ? "input is-error" : "input"} placeholder="••••-••••-•••" autoComplete="off" required style={{ paddingRight: "40px" }} />
          {error === "password" && <span className="error-text">{message}</span>}
        </div>
      )}
      {needsIdentity && (
        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="vname"><span>{t("viewer.your_name")}</span><span className="req">*</span></label>
            <input id="vname" name="name" className="input" autoComplete="name" defaultValue={state?.name ?? ""} required />
          </div>
          <div className="field">
            <label className="label" htmlFor="vmail"><span>{t("viewer.your_email")}</span><span className="req">*</span></label>
            <input id="vmail" name="email" className={error === "identity" ? "input is-error" : "input"} type="email" autoComplete="email" defaultValue={state?.email ?? ""} required />
            {domains.length > 0 && <span className="hint">{domains.map((d) => `@${d}`).join(", ")}</span>}
            {error === "identity" && <span className="error-text">{message}</span>}
          </div>
        </div>
      )}
      {error === "identity" && !needsIdentity && <span className="error-text">{message}</span>}
      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={pending}><Icon name="unlock" /><span>{t("viewer.open")}</span></button>
      {footer}
    </form>
  );
}
