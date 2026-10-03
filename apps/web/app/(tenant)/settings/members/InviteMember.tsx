"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { LANGS } from "@/i18n/config";
import { invite, type InviteState } from "./actions";

/** "Invite member" button + modal (app/settings-members.html) → invite Server Action; closes once every address was invited. `branches` feeds the Branch suggestions. */
export function InviteMember({ defaultLang, branches }: { defaultLang: string; branches: string[] }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(invite, {} as InviteState);
  useEffect(() => {
    if (state.ok && !state.error) setOpen(false);
  }, [state]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}><Icon name="plus" /><span>{t("members.invite")}</span></button>
      {open && (
        <div className="modal-backdrop" id="inviteModal" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <form className="modal" action={formAction}>
            <div className="card-header">
              <h3>{t("members.invite")}</h3>
              <button className="btn btn-ghost btn-icon" type="button" onClick={() => setOpen(false)} aria-label={t("common.cancel")}><Icon name="x" /></button>
            </div>
            <div className="card-body stack">
              {state.error && <div className="callout callout-danger" role="alert"><Icon name="alert" /><div>{state.error}</div></div>}
              <div className="field">
                <label className="label" htmlFor="inviteEmails">{t("members.invite_emails")}</label>
                <textarea id="inviteEmails" name="emails" className="textarea" style={{ minHeight: "70px" }} placeholder={t("members.invite_emails_ph")} required autoFocus />
              </div>
              <div className="form-grid">
                <div className="field">
                  <label className="label" htmlFor="inviteRole">{t("common.role")}</label>
                  <select id="inviteRole" name="role" className="select"><option value="member">{t("role.user")}</option><option value="admin">{t("role.admin")}</option></select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="inviteBranch">{t("members.branch")}</label>
                  <input id="inviteBranch" name="branch" className="input" list="inviteBranches" maxLength={60} autoComplete="off" />
                  <datalist id="inviteBranches">{branches.map((b) => <option key={b} value={b} />)}</datalist>
                </div>
              </div>
              <div className="field">
                <label className="label" htmlFor="inviteLang">{t("members.invite_lang")}</label>
                <select id="inviteLang" name="lang" className="select" defaultValue={defaultLang}>
                  {LANGS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </div>
              <p className="hint">{t("members.invite_hint")}</p>
            </div>
            <div className="card-footer">
              <button className="btn" type="button" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
              <button className="btn btn-primary" type="submit" disabled={pending}><Icon name="send" /><span>{t("members.send_invites")}</span></button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
