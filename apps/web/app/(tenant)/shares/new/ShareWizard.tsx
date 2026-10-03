"use client";

import type { LinkDefaults } from "@rireki/shared";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import type { LinkFormValues } from "@/lib/shares/form";
import { createShareLink, sendShareEmail, type LinkCreated, type LinkFormState, type SendState } from "../actions";
import { CandidatePicker, type PickerRow } from "./CandidatePicker";
import { LinkSettingsFields } from "./LinkSettingsFields";

type Props = {
  rows: PickerRow[];
  preselected: string[];
  defaults: LinkDefaults;
  initial: LinkFormValues;
  clients: string[];
  locale: string;
  sender: string;
};

/** app/share-new.html: step 1 pick (ordered selection), step 2 settings form → createShareLink, step 3 from the result. */
export function ShareWizard({ rows, preselected, defaults, initial, clients, sender }: Props) {
  const t = useTranslations();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>(preselected);
  const [state, formAction, pending] = useActionState<LinkFormState, FormData>(createShareLink, null);
  const created = state?.ok ? state : null;
  const current = created ? 3 : step;
  const steps = [t("sharenew.step1"), t("sharenew.step2"), t("sharenew.step3")];
  const job = rows.find((r) => r.id === selected[0])?.tags[0];

  return (
    <>
      {/* same markup as components/Stepper.tsx, controlled by this component */}
      <div className="stepper mb-24">
        {steps.map((label, i) => (
          <button key={i} type="button" className={`step${i + 1 < current ? " done" : i + 1 === current ? " active" : ""}`} disabled={!!created || (i === 1 && selected.length === 0) || i === 2} onClick={() => setStep(i + 1)}>
            <span className="n">{i + 1}</span>
            <span className="t">{label}</span>
          </button>
        ))}
      </div>

      {current === 1 && <CandidatePicker rows={rows} selected={selected} onChange={setSelected} onNext={() => setStep(2)} />}

      {current === 2 && (
        <form action={formAction}>
          {selected.map((id) => <input key={id} type="hidden" name="candidateIds" value={id} />)}
          <LinkSettingsFields
            initial={initial}
            defaults={defaults}
            errors={state && !state.ok ? state.fieldErrors : undefined}
            clients={clients}
            candidateCount={selected.length}
            job={job}
            mode="create"
            footer={
              <>
                <button className="btn" type="button" onClick={() => setStep(1)}><Icon name="arrow-left" /><span>{t("common.back")}</span></button>
                <button className="btn btn-primary" type="submit" disabled={pending}><Icon name="link" /><span>{t("sharenew.create")}</span></button>
              </>
            }
          />
        </form>
      )}

      {created && <Created link={created} sender={sender} />}
    </>
  );
}

/** Step 3: URL, password (shown once), QR code, editable email draft → sendShareEmail. */
function Created({ link, sender }: { link: LinkCreated; sender: string }) {
  const t = useTranslations();
  const f = useFormatter();
  const [body, setBody] = useState(link.draft.body);
  const [includePassword, setIncludePassword] = useState(false);
  const [sent, send, sending] = useActionState<SendState, FormData>(sendShareEmail, null);
  const fullBody = includePassword && link.password ? `${body}\n\n${t("auth.password")}: ${link.password}` : body;
  const expires = link.expiresAt ? f.dateTime(new Date(link.expiresAt), { dateStyle: "medium" }) : t("sharenew.no_expiry");
  const errors = sent && !sent.ok ? sent.fieldErrors : {};

  return (
    <div className="grid grid-main-aside">
      <div className="stack">
        <div className="callout callout-success">
          <Icon name="check-circle" />
          <div><b>{t("sharenew.created_t")}</b><br /><span>{t("sharenew.created_d")}</span></div>
        </div>
        <section className="card">
          <div className="card-body stack">
            <div className="field">
              <span className="label">{t("sharenew.link_url")}</span>
              <div className="link-box">
                <span className="url">{link.url}</span><CopyButton className="btn btn-sm" text={link.url}><Icon name="copy" /><span>{t("common.copy_link")}</span></CopyButton>
              </div>
            </div>
            {link.password && (
              <div className="field">
                <span className="label">{t("auth.password")}</span>
                <div className="link-box">
                  <span className="url">{link.password}</span><CopyButton className="btn btn-sm" text={link.password}><Icon name="copy" /><span>{t("common.copy_password")}</span></CopyButton>
                </div>
              </div>
            )}
            <div className="row" style={{ gap: "16px", alignItems: "flex-start" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL from `qrcode` */}
              <img className="qr" src={link.qrDataUrl} alt="QR code" width={120} height={120} />
              <div className="stack" style={{ gap: "6px" }}>
                <b>{t("sharenew.qr_t")}</b>
                <p className="small muted">{t("sharenew.qr_d")}</p>
                <a className="btn btn-sm" style={{ alignSelf: "flex-start" }} href={link.qrDataUrl} download={`rireki-${link.token}.png`}><Icon name="download" /><span>{t("sharenew.qr_dl")}</span></a>
              </div>
            </div>
          </div>
        </section>
        <form action={send}>
          <section className="card">
            <div className="card-header">
              <h3>{t("sharenew.email_t")}</h3>
              <span className="small muted">{sender}</span>
            </div>
            <div className="card-body stack">
              <input type="hidden" name="id" value={link.id} />
              <input type="hidden" name="body" value={fullBody} />
              <div className="form-grid">
                <div className="field">
                  <label className="label" htmlFor="to">{t("sharenew.to")}</label>
                  <input id="to" name="to" className={errors.to ? "input is-error" : "input"} type="email" defaultValue={link.draft.to} required />
                  {errors.to && <span className="error-text">{errors.to}</span>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="subject">{t("sharenew.subject")}</label>
                  <input id="subject" name="subject" className={errors.subject ? "input is-error" : "input"} defaultValue={link.draft.subject} required />
                  {errors.subject && <span className="error-text">{errors.subject}</span>}
                </div>
              </div>
              <div className="field">
                <label className="label" htmlFor="draftBody">{t("sharenew.body")}</label>
                <textarea id="draftBody" className={errors.body ? "textarea is-error" : "textarea"} style={{ minHeight: "150px" }} value={body} onChange={(e) => setBody(e.target.value)} />
                {errors.body && <span className="error-text">{errors.body}</span>}
              </div>
              {link.password && <label className="check"><input type="checkbox" checked={includePassword} onChange={(e) => setIncludePassword(e.target.checked)} /><span>{t("sharenew.include_pw")}</span></label>}
              {sent?.ok && <div className="callout callout-success"><Icon name="check-circle" /><div>{t("sharenew.send_email")} · {sent.to}</div></div>}
            </div>
            <div className="card-footer between">
              <CopyButton className="btn" text={fullBody}><Icon name="copy" /><span>{t("sharenew.copy_message")}</span></CopyButton>
              <button className="btn btn-primary" type="submit" disabled={sending}><Icon name="send" /><span>{t("sharenew.send_email")}</span></button>
            </div>
          </section>
        </form>
      </div>
      <aside className="stack">
        <section className="card">
          <div className="card-body stack">
            <a className="btn btn-block" href={`/s/${link.token}`} target="_blank" rel="noreferrer"><Icon name="external" /><span>{t("sharenew.preview")}</span></a>
            <Link className="btn btn-block" href={`/shares/${link.id}`}><Icon name="activity" /><span>{t("shares.tracking")}</span></Link>
            <Link className="btn btn-block btn-ghost" href="/shares">{t("sharenew.back_list")}</Link>
          </div>
        </section>
        <section className="card">
          <div className="card-header"><h3>{t("common.summary")}</h3></div>
          <div className="card-body">
            <dl className="kv">
              <dt>{t("shares.link_name")}</dt><dd>{link.name}</dd>
              <dt>{t("cand.title")}</dt><dd>{link.candidateCount}</dd>
              <dt>{t("shares.protection")}</dt><dd><span>{t(link.hasPassword ? "shares.password" : "shares.no_password")}</span> · <span>{t(link.downloadAllowed ? "shares.download_allowed" : "shares.view_only")}</span></dd>
              <dt>{t("common.expires")}</dt><dd>{expires}</dd>
              <dt>{t("common.created_by")}</dt><dd>{sender}</dd>
            </dl>
          </div>
        </section>
      </aside>
    </div>
  );
}
