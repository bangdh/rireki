"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Icon } from "@/components/Icon";
import { PasswordInput } from "@/components/PasswordInput";
import { acceptInvitation, type AcceptState } from "./actions";

/** Join form of the invitation page; `existing` = the invitee is signed in with an existing account and only confirms. */
export function InviteForm({ id, email, org, existing }: { id: string; email: string; org: string; existing: boolean }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(acceptInvitation, {} as AcceptState);
  return (
    <form className="auth-card" action={formAction}>
      <div>
        <h1>{t("auth.invite_title", { org })}</h1>
        <p className="muted mt-8">{t("members.invite_hint")}</p>
      </div>
      {state.error && <div className="callout callout-danger" role="alert"><Icon name="alert" /><div>{state.error}</div></div>}
      <input type="hidden" name="invitationId" value={id} />
      <div className="field">
        <label htmlFor="email">{t("auth.email")}</label>
        <input id="email" className="input" type="email" value={email} readOnly />
      </div>
      {!existing && (
        <>
          <div className="field">
            <label htmlFor="name">{t("signup.admin_name")}</label>
            <input id="name" name="name" className="input" required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="pw">{t("auth.password")}</label>
            <PasswordInput id="pw" name="password" className="input" minLength={10} required autoComplete="new-password" style={{ paddingLeft: "12px", paddingRight: "40px" }} />
            <span className="hint">{t("signup.pw_hint")}</span>
          </div>
        </>
      )}
      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={pending}>{t("auth.invite_join")}</button>
    </form>
  );
}
