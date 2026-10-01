"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

/** "Invite member" button + modal (app/settings-members.html). TODO(auth-tenant): Server Action organization.inviteMember + invitation email. */
export function InviteMember() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}><Icon name="plus" /><span>{t("members.invite")}</span></button>
      <div className="modal-backdrop" id="inviteModal" hidden={!open} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
        <form
          className="modal"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
          }}
        >
          <div className="card-header">
            <h3>{t("members.invite")}</h3>
            <button className="btn btn-ghost btn-icon" type="button" onClick={() => setOpen(false)} aria-label="Close"><Icon name="x" /></button>
          </div>
          <div className="card-body stack">
            <div className="field">
              <label className="label" htmlFor="inviteEmails">{t("members.invite_emails")}</label>
              <textarea id="inviteEmails" name="emails" className="textarea" style={{ minHeight: "70px" }} placeholder={t("members.invite_emails_ph")} autoFocus={open} />
            </div>
            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="inviteRole">{t("common.role")}</label>
                <select id="inviteRole" name="role" className="select"><option value="member">{t("role.user")}</option><option value="admin">{t("role.admin")}</option></select>
              </div>
              <div className="field">
                <label className="label" htmlFor="inviteBranch">{t("members.branch")}</label>
                <select id="inviteBranch" name="branch" className="select"><option>Hà Nội HQ</option><option>Yangon</option><option>Dhaka</option></select>
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="inviteLang">{t("members.invite_lang")}</label>
              <select id="inviteLang" name="lang" className="select" defaultValue="vi"><option value="vi">Tiếng Việt</option><option value="en">English</option><option value="ja">日本語</option><option value="my">မြန်မာ</option><option value="id">Bahasa Indonesia</option></select>
            </div>
            <p className="hint">{t("members.invite_hint")}</p>
          </div>
          <div className="card-footer">
            <button className="btn" type="button" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
            <button className="btn btn-primary" type="submit"><Icon name="send" /><span>{t("members.send_invites")}</span></button>
          </div>
        </form>
      </div>
    </>
  );
}
