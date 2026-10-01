import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import { PasswordInput } from "@/components/PasswordInput";
import { StaticForm } from "@/components/StaticForm";
import { StepGo, StepPanel, Stepper } from "@/components/Stepper";
import { Table } from "@/components/Table";
import { byCode, LINK, ME, TENANT } from "@/lib/sample";
import { STATUS_BADGE } from "@/lib/ui";

// app/share-new.html — 3-step wizard. TODO(share-viewer): candidate picker with selection state (?candidate= preselects one),
// createShareLink Server Action validated by ShareLinkInput, generated password + nanoid token, QR via `qrcode`, email draft.
const ROWS = ["SV000182", "SV000215", "SV000224", "SV000188", "SV000201", "SV000176", "SV000203"].map(byCode);
const SELECTED = ROWS.slice(0, 5);

export default async function ShareNewPage({ searchParams }: { searchParams: Promise<{ candidate?: string }> }) {
  await searchParams;
  const t = await getTranslations();
  return (
    <main className="main" id="main">
      <div className="crumbs"><Link href="/shares">{t("shares.title")}</Link><span>/</span><span>{t("shares.new")}</span></div>
      <div className="page-header">
        <div>
          <h1>{t("shares.new")}</h1>
          <p className="sub">{t("sharenew.sub")}</p>
        </div>
      </div>
      <Stepper steps={[t("sharenew.step1"), t("sharenew.step2"), t("sharenew.step3")]}>
        <StepPanel step={1}>
          <div className="grid grid-main-aside">
            <section className="card">
              <div className="table-toolbar">
                <div className="search input-wrap"><Icon name="search" /><input className="input input-sm" placeholder={t("cand.search_ph")} /></div>
                <select className="select select-sm" style={{ width: "auto" }} defaultValue="溶接" aria-label={t("cand.job")}><option value="">{t("cand.job")}</option><option>溶接</option><option>介護</option><option>建設</option></select>
                <select className="select select-sm" style={{ width: "auto" }} aria-label={t("cand.nationality")}><option value="">{t("cand.nationality")}</option><option>🇻🇳 Vietnam</option><option>🇲🇲 Myanmar</option></select>
                <select className="select select-sm" style={{ width: "auto" }} aria-label="JLPT"><option value="">JLPT</option><option>N3+</option><option>N4+</option></select>
                <button className="filter-chip active" type="button"><span>{t("status.available")}</span></button>
              </div>
              <div className="table-wrap">
                <Table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: "36px" }}><input type="checkbox" aria-label="Select all" /></th><th>{t("cand.candidate")}</th><th>{t("cand.code")}</th><th>{t("cand.gender_age")}</th><th>JLPT</th><th>{t("cand.video")}</th><th>{t("common.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((c) => (
                      <tr key={c.id}>
                        <td><input type="checkbox" aria-label="Select" defaultChecked={SELECTED.includes(c)} /></td>
                        <td>
                          <div className="person"><span className="avatar-photo">{c.initials}</span><div><div className="n">{c.name}</div><div className="k">{c.kana}</div></div></div>
                        </td>
                        <td className="mono">{c.code}</td>
                        <td><span>{t(`gender.${c.gender}`)}</span> · {c.age}</td>
                        <td><span className="badge badge-primary">{c.jlpt}</span></td>
                        <td className="nums" style={c.videos ? undefined : { color: "var(--warning)" }}>{c.videos}</td>
                        <td><span className={STATUS_BADGE[c.status]}>{t(`status.${c.status}`)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <div className="pagination">
                <span><span>{t("common.showing")}</span> 1–{ROWS.length} <span>{t("common.of")}</span> 23 <span>{t("sharenew.matching")}</span></span>
                <div className="pages"><button type="button" className="active">1</button><button type="button">2</button><button type="button">3</button><button type="button">4</button></div>
                <span></span>
              </div>
            </section>
            <aside className="stack">
              <section className="card">
                <div className="card-header">
                  <h3><span>{t("common.selected")}</span> <span className="badge badge-primary">{SELECTED.length}</span></h3>
                  <button className="btn btn-sm btn-ghost" type="button">{t("common.clear")}</button>
                </div>
                <div className="card-body stack" style={{ gap: "8px" }}>
                  {SELECTED.map((c) => (
                    <div className="row between" key={c.id}>
                      <div className="person"><span className="avatar avatar-sm">{c.initials}</span><div><div className="n small">{c.name}</div><div className="k">{c.code}</div></div></div>
                      <button className="btn btn-ghost btn-icon btn-sm" type="button" aria-label="Remove"><Icon name="x" /></button>
                    </div>
                  ))}
                  <p className="hint">{t("sharenew.order_hint")}</p>
                </div>
                <div className="card-footer"><StepGo className="btn btn-primary btn-block" to="next"><span>{t("common.next")}</span><Icon name="arrow-right" /></StepGo></div>
              </section>
            </aside>
          </div>
        </StepPanel>

        <StepPanel step={2}>
          <StaticForm className="grid grid-main-aside">
            <div className="stack">
              <section className="card">
                <div className="card-header"><h3>{t("sharenew.basics")}</h3></div>
                <div className="card-body form-grid">
                  <div className="field span-2">
                    <label className="label" htmlFor="name"><span>{t("shares.link_name")}</span><span className="req">*</span></label><input id="name" name="name" className="input" defaultValue={LINK.name} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="clientCompany">{t("sharenew.client_company")}</label>
                    <input id="clientCompany" name="clientCompany" className="input" list="clients" defaultValue={LINK.client} />
                    <datalist id="clients"><option>株式会社ヤマト建設</option><option>東海協同組合</option><option>さくら介護グループ</option></datalist>
                  </div>
                  <div className="field"><label className="label" htmlFor="clientName">{t("sharenew.client_contact")}</label><input id="clientName" name="clientName" className="input" defaultValue={LINK.contact} /></div>
                  <div className="field"><label className="label" htmlFor="clientEmail">{t("sharenew.client_email")}</label><input id="clientEmail" name="clientEmail" className="input" type="email" defaultValue={LINK.clientEmail} /></div>
                  <div className="field">
                    <label className="label" htmlFor="viewerLang">{t("sharenew.viewer_lang")}</label>
                    <select id="viewerLang" name="viewerLang" className="select" defaultValue="ja"><option value="ja">日本語</option><option value="en">English</option><option value="vi">Tiếng Việt</option><option value="my">မြန်မာ</option><option value="id">Bahasa Indonesia</option></select>
                  </div>
                  <div className="field span-2">
                    <label className="label" htmlFor="message">{t("sharenew.message")}</label><textarea id="message" name="message" className="textarea" style={{ minHeight: "70px" }} defaultValue={LINK.message} />
                  </div>
                </div>
              </section>
              <section className="card">
                <div className="card-header"><h3>{t("sharenew.access")}</h3></div>
                <div className="card-body stack-lg">
                  <div className="row between" style={{ alignItems: "flex-start", gap: "16px" }}>
                    <div><b>{t("sharenew.pw_t")}</b><p className="hint">{t("sharenew.pw_d")}</p></div>
                    <label className="switch"><input type="checkbox" name="passwordEnabled" defaultChecked /><span className="track"></span></label>
                  </div>
                  <div className="row" style={{ maxWidth: "480px" }}>
                    <div className="grow">
                      <PasswordInput id="password" name="password" className="input mono" defaultValue={LINK.password} defaultShown style={{ paddingLeft: "12px", paddingRight: "76px" }}>
                        <CopyButton className="btn btn-ghost btn-icon btn-sm" aria-label="Copy" text={LINK.password}><Icon name="copy" /></CopyButton>
                      </PasswordInput>
                    </div>
                    <button className="btn" type="button"><Icon name="refresh" /><span>{t("sharenew.regenerate")}</span></button>
                  </div>
                  <hr style={{ border: "0", borderTop: "1px solid var(--border)", margin: "0" }} />
                  <div className="row between" style={{ alignItems: "flex-start", gap: "16px" }}>
                    <div><b>{t("sharenew.identity_t")}</b><p className="hint">{t("sharenew.identity_d")}</p></div>
                    <label className="switch"><input type="checkbox" name="requireIdentity" defaultChecked /><span className="track"></span></label>
                  </div>
                  <div className="field" style={{ maxWidth: "480px" }}>
                    <label className="label" htmlFor="domain">{t("sharenew.domains")}</label>
                    <div className="row">
                      {LINK.domains.map((d) => <span key={d} className="chip">{d}<button type="button" aria-label="Remove"><Icon name="x" className="ic-sm" /></button></span>)}
                      <input id="domain" className="input input-sm" placeholder="@example.co.jp" style={{ width: "180px" }} />
                    </div>
                  </div>
                </div>
              </section>
              <section className="card">
                <div className="card-header"><h3>{t("sharenew.permissions")}</h3></div>
                <div className="card-body stack">
                  <div className="radio-cards">
                    <label className="radio-card">
                      <input type="radio" name="downloadAllowed" value="false" defaultChecked />
                      <div>
                        <div className="t"><span>{t("sharenew.viewonly_t")}</span> <span className="badge badge-primary">{t("common.recommended")}</span></div>
                        <div className="d">{t("sharenew.viewonly_d")}</div>
                      </div>
                    </label>
                    <label className="radio-card">
                      <input type="radio" name="downloadAllowed" value="true" />
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
                    <input id="expiresAt" name="expiresAt" className="input" type="date" defaultValue="2026-10-03" />
                    <div className="row mt-8" style={{ gap: "6px" }}>
                      {[7, 14, 30].map((d) => <button key={d} className="filter-chip" type="button">{d} <span>{t("common.days")}</span></button>)}
                      <button className="filter-chip" type="button">{t("sharenew.no_expiry")}</button>
                    </div>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="maxViews">{t("sharenew.max_views")}</label><input id="maxViews" name="maxViews" className="input" type="number" min="1" placeholder={t("common.unlimited")} /><span className="hint">{t("sharenew.max_views_hint")}</span>
                  </div>
                </div>
              </section>
              <section className="card">
                <div className="card-header"><h3>{t("sharenew.sections")}</h3></div>
                <div className="card-body grid grid-2" style={{ gap: "12px" }}>
                  <label className="switch"><input type="checkbox" name="photo" defaultChecked /><span className="track"></span><span><span>{t("form.photo")}</span></span></label>
                  <label className="switch"><input type="checkbox" name="contact" /><span className="track"></span><span><span>{t("sharenew.sec_contact")}</span> <span className="hint">{t("sharenew.sec_contact_hint")}</span></span></label>
                  <label className="switch"><input type="checkbox" name="family" defaultChecked /><span className="track"></span><span>{t("form.family")}</span></label>
                  <label className="switch"><input type="checkbox" name="health" defaultChecked /><span className="track"></span><span>{t("form.health")}</span></label>
                  <label className="switch"><input type="checkbox" name="videos" defaultChecked /><span className="track"></span><span>{t("form.videos")}</span></label>
                  <label className="switch"><input type="checkbox" name="documents" /><span className="track"></span><span>{t("sharenew.sec_docs")}</span></label>
                  <label className="switch"><input type="checkbox" name="feedback" defaultChecked /><span className="track"></span><span>{t("sharenew.sec_interested")}</span></label>
                  <label className="switch"><input type="checkbox" name="notify" defaultChecked /><span className="track"></span><span>{t("sharenew.sec_notify")}</span></label>
                </div>
              </section>
            </div>
            <aside>
              <div className="card sticky-aside">
                <div className="card-header"><h3>{t("common.summary")}</h3></div>
                <div className="card-body stack" style={{ gap: "10px" }}>
                  <dl className="kv">
                    <dt>{t("cand.title")}</dt><dd>{SELECTED.length} · 溶接</dd>
                    <dt>{t("shares.client")}</dt><dd>{LINK.client}</dd>
                    <dt>{t("sharenew.access")}</dt><dd><span>{t("shares.password")}</span> + <span>{t("sharenew.identity_short")}</span></dd>
                    <dt>{t("shares.protection")}</dt><dd><span className="badge badge-warning"><Icon name="eye" /><span>{t("shares.view_only")}</span></span></dd>
                    <dt>{t("common.expires")}</dt><dd>{LINK.expiresFull}</dd>
                    <dt>{t("sharenew.hidden")}</dt><dd>{t("sharenew.hidden_v")}</dd>
                  </dl>
                </div>
                <div className="card-footer between">
                  <StepGo className="btn" to="prev"><Icon name="arrow-left" /><span>{t("common.back")}</span></StepGo>
                  <StepGo className="btn btn-primary" to="next"><Icon name="link" /><span>{t("sharenew.create")}</span></StepGo>
                </div>
              </div>
            </aside>
          </StaticForm>
        </StepPanel>

        <StepPanel step={3}>
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
                      <span className="url">{LINK.url}</span><CopyButton className="btn btn-sm" text={LINK.url}><Icon name="copy" /><span>{t("common.copy_link")}</span></CopyButton>
                    </div>
                  </div>
                  <div className="field">
                    <span className="label">{t("auth.password")}</span>
                    <div className="link-box">
                      <span className="url">{LINK.password}</span><CopyButton className="btn btn-sm" text={LINK.password}><Icon name="copy" /><span>{t("common.copy_password")}</span></CopyButton>
                    </div>
                  </div>
                  <div className="row" style={{ gap: "16px", alignItems: "flex-start" }}>
                    <div className="qr" aria-label="QR code"></div>
                    <div className="stack" style={{ gap: "6px" }}>
                      <b>{t("sharenew.qr_t")}</b>
                      <p className="small muted">{t("sharenew.qr_d")}</p>
                      <button className="btn btn-sm" type="button" style={{ alignSelf: "flex-start" }}><Icon name="download" /><span>{t("sharenew.qr_dl")}</span></button>
                    </div>
                  </div>
                </div>
              </section>
              <section className="card">
                <div className="card-header">
                  <h3>{t("sharenew.email_t")}</h3>
                  <span className="small muted">{t("sharenew.email_from")}</span>
                </div>
                <div className="card-body stack">
                  <div className="form-grid">
                    <div className="field"><label className="label" htmlFor="to">{t("sharenew.to")}</label><input id="to" className="input" defaultValue={LINK.clientEmail} /></div>
                    <div className="field"><label className="label" htmlFor="subject">{t("sharenew.subject")}</label><input id="subject" className="input" defaultValue={`【${TENANT.name}】溶接候補者5名 履歴書のご送付`} /></div>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="body">{t("sharenew.body")}</label>
                    <textarea
                      id="body"
                      className="textarea"
                      style={{ minHeight: "150px" }}
                      defaultValue={`${LINK.client}\n${LINK.contact} 様\n\nお世話になっております。${TENANT.name}の ${ME.name} です。\n溶接職種の候補者5名の履歴書・自己紹介動画を下記リンクよりご確認ください。\n\n${LINK.url}\n（閲覧期限：${LINK.expiresJa}）\n\nパスワードは別途お電話・LINEにてお伝えいたします。\nご不明点がございましたらお気軽にご連絡ください。`}
                    />
                  </div>
                  <label className="check"><input type="checkbox" /><span>{t("sharenew.include_pw")}</span></label>
                </div>
                <div className="card-footer between">
                  <CopyButton className="btn" text={LINK.url}><Icon name="copy" /><span>{t("sharenew.copy_message")}</span></CopyButton>
                  <button className="btn btn-primary" type="button"><Icon name="send" /><span>{t("sharenew.send_email")}</span></button>
                </div>
              </section>
            </div>
            <aside className="stack">
              <section className="card">
                <div className="card-body stack">
                  <Link className="btn btn-block" href={`/s/${LINK.token}`}><Icon name="external" /><span>{t("sharenew.preview")}</span></Link>
                  <Link className="btn btn-block" href={`/shares/${LINK.id}`}><Icon name="activity" /><span>{t("shares.tracking")}</span></Link>
                  <Link className="btn btn-block btn-ghost" href="/shares">{t("sharenew.back_list")}</Link>
                </div>
              </section>
              <section className="card">
                <div className="card-header"><h3>{t("common.summary")}</h3></div>
                <div className="card-body">
                  <dl className="kv">
                    <dt>{t("shares.link_name")}</dt><dd>{LINK.name}</dd>
                    <dt>{t("cand.title")}</dt><dd>{SELECTED.length}</dd>
                    <dt>{t("shares.protection")}</dt><dd><span>{t("shares.password")}</span> · <span>{t("shares.view_only")}</span></dd>
                    <dt>{t("common.expires")}</dt><dd>{LINK.expiresFull}</dd>
                    <dt>{t("common.created_by")}</dt><dd>{ME.name}</dd>
                  </dl>
                </div>
              </section>
            </aside>
          </div>
        </StepPanel>
      </Stepper>
    </main>
  );
}
