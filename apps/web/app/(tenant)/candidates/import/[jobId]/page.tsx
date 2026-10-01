import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { StaticForm } from "@/components/StaticForm";
import { Table } from "@/components/Table";
import { TENANT } from "@/lib/sample";

// app/candidate-import.html — review of the fields extracted from an uploaded CV.
// TODO(import): load ImportJob by jobId (tenantId), render extracted/confidence from the job, page thumbnails from the
// extractor, Server Action that saves the candidate with the photo. Below is the mockup's sample (Su Su Hlaing).
export default async function ImportReviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  await params;
  const t = await getTranslations();
  const conf = (level: "low" | "high") => <span className={`conf ${level}`}>{t(level === "low" ? "import.conf_low" : "import.conf_high")}</span>;
  return (
    <main className="main" id="main">
      <div className="crumbs">
        <Link href="/candidates">{t("cand.title")}</Link><span>/</span><Link href="/candidates/new">{t("cand.add")}</Link><span>/</span><span>{t("cand.import")}</span>
      </div>
      <div className="page-header">
        <div>
          <h1>{t("cand.import")}</h1>
          <p className="sub">{t("import.sub")}</p>
        </div>
      </div>
      <div className="stepper mb-24" aria-label="Progress">
        <div className="step done"><span className="n"><Icon name="check" className="ic-sm" /></span><span className="t">{t("import.step_upload")}</span></div>
        <div className="step active"><span className="n">2</span><span className="t">{t("import.step_review")}</span></div>
        <div className="step"><span className="n">3</span><span className="t">{t("import.step_save")}</span></div>
      </div>
      <div className="callout callout-success mb-16">
        <Icon name="sparkles" />
        <div>
          <b>CV_Su_Su_Hlaing.pdf</b> · 3 <span>{t("import.pages")}</span> · <span>{t("import.detected")}</span>: 日本語 + English<br /><span>{t("import.result")}</span>
        </div>
      </div>
      <div className="grid grid-aside-main grid-doc">
        <div className="stack">
          <div className="doc-preview">
            <div className="row between">
              <span className="strong small">{t("import.original")}</span>
              <span className="row-nowrap"><button className="btn btn-sm btn-ghost btn-icon" type="button" aria-label="Previous"><Icon name="chev-left" /></button><span className="small nums">1 / 3</span><button className="btn btn-sm btn-ghost btn-icon" type="button" aria-label="Next"><Icon name="chev-right" /></button></span>
            </div>
            {/* placeholder page thumbnail (the mockup's grey lines) until page images come from the extractor */}
            <div className="doc-page">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                <div style={{ flex: "1" }}>
                  <div className="l m" style={{ height: "9px", width: "30%", background: "#333" }}></div><div className="l s"></div><div className="l hl"></div><div className="l m"></div><div className="l s"></div>
                </div>
                <div style={{ width: "44px", height: "56px", background: "#DDD", border: "1px solid #BBB" }}></div>
              </div>
              <div style={{ marginTop: "8px", borderTop: "1px solid #ccc", paddingTop: "6px" }}>
                <div className="l m" style={{ background: "#333", height: "7px", width: "20%" }}></div><div className="l"></div><div className="l m"></div><div className="l"></div><div className="l m"></div><div className="l"></div><div className="l m hl"></div>
              </div>
              <div style={{ marginTop: "8px", borderTop: "1px solid #ccc", paddingTop: "6px" }}>
                <div className="l m" style={{ background: "#333", height: "7px", width: "30%" }}></div><div className="l"></div><div className="l"></div><div className="l s"></div><div className="l"></div><div className="l"></div><div className="l s"></div>
              </div>
            </div>
            <p className="xs faint">{t("import.preview_hint")}</p>
          </div>
          <div className="card">
            <div className="card-body stack" style={{ gap: "10px" }}>
              <div className="row between"><span className="strong small">{t("import.file_info")}</span></div>
              <dl className="kv small">
                <dt>{t("common.file")}</dt><dd className="mono">CV_Su_Su_Hlaing.pdf · 2.4 MB</dd>
                <dt>{t("common.uploaded_by")}</dt><dd>Aung Myat · 09:31</dd>
                <dt>{t("import.keep_original")}</dt><dd><span>{t("import.keep_original_d")}</span></dd>
              </dl>
              <button className="btn btn-sm" type="button">{t("import.reupload")}</button>
            </div>
          </div>
        </div>
        <StaticForm className="stack">
          <section className="card">
            <div className="card-header">
              <h3>{t("form.s1")}</h3>
              <span className="badge badge-warning">2 <span>{t("import.to_check")}</span></span>
            </div>
            <div className="card-body form-grid">
              <div className="field">
                <label htmlFor="code">{t("cand.code")}</label>
                <div className="input-group"><span className="addon lead">{TENANT.nextCode.slice(0, 2)}</span><input id="code" className="input mono" maxLength={6} pattern="[0-9]{6}" inputMode="numeric" defaultValue={TENANT.nextCode.slice(2)} readOnly /></div>
                <span className="hint">{t("import.code_auto")}</span>
              </div>
              <div className="field">
                <label htmlFor="nameKana"><span>{t("form.name_kana")}</span> {conf("low")}</label>
                <input id="nameKana" className="input hl" defaultValue="スー・スー・ライン" /><span className="hint">{t("import.kana_hint")}</span>
              </div>
              <div className="field">
                <label htmlFor="nameLatin"><span>{t("form.name_romaji")}</span> {conf("high")}</label>
                <input id="nameLatin" className="input" defaultValue="SU SU HLAING" />
              </div>
              <div className="field"><label htmlFor="nameNative">{t("form.name_native")}</label><input id="nameNative" className="input" defaultValue="စုစုလှိုင်" /></div>
              <div className="field"><label htmlFor="dob">{t("form.dob")}</label><input id="dob" className="input" type="date" defaultValue="2005-04-12" /></div>
              <div className="field">
                <label htmlFor="gender">{t("form.gender")}</label>
                <select id="gender" className="select"><option value="female">{t("gender.f")}</option><option value="male">{t("gender.m")}</option></select>
              </div>
              <div className="field">
                <label htmlFor="nationality">{t("cand.nationality")}</label>
                <select id="nationality" className="select" defaultValue="MM"><option value="MM">🇲🇲 Myanmar</option><option value="VN">🇻🇳 Vietnam</option><option value="BD">🇧🇩 Bangladesh</option><option value="ID">🇮🇩 Indonesia</option></select>
              </div>
              <div className="field">
                <label htmlFor="situation">{t("form.status")}</label>
                <select id="situation" className="select"><option value="job_hunting">{t("form.status_hunting")}</option><option value="in_training">{t("form.status_training")}</option><option value="employed">{t("form.status_employed")}</option></select>
              </div>
              <div className="field">
                <label htmlFor="familyCount"><span>{t("form.family_count")}</span> {conf("low")}</label>
                <div className="input-group"><input id="familyCount" className="input hl" type="number" min="1" style={{ maxWidth: "120px" }} defaultValue="3" /><span className="addon">人</span></div>
              </div>
              <div className="field">
                <label htmlFor="spouse">{t("form.spouse")}</label>
                <select id="spouse" className="select"><option value="false">{t("common.no")}</option><option value="true">{t("common.yes")}</option></select>
              </div>
            </div>
          </section>
          <section className="card">
            <div className="card-header"><h3>{t("form.s2")}</h3></div>
            <div className="card-body form-grid">
              <div className="field"><label htmlFor="mobile">{t("form.mobile")}</label><input id="mobile" className="input" defaultValue="+95 9 420 118 233" /></div>
              <div className="field"><label htmlFor="email">{t("auth.email")}</label><input id="email" className="input" defaultValue="susu.hlaing@gmail.com" /></div>
              <div className="field"><label htmlFor="address">{t("form.address")}</label><input id="address" className="input" defaultValue="No. 45, Bo Aung Kyaw Street, Kyauktada, Yangon, Myanmar" /></div>
              <div className="field"><label htmlFor="addressKana">{t("form.address_kana")}</label><input id="addressKana" className="input" defaultValue="ミャンマー　ヤンゴン" /></div>
            </div>
          </section>
          <section className="card">
            <div className="card-header">
              <h3>{t("form.s3")}</h3>
              <span className="badge badge-warning">1 <span>{t("import.to_check")}</span></span>
            </div>
            <div className="card-body stack">
              <div>
                <span className="label">{t("form.education")}</span>
                <div className="table-wrap mt-8">
                  <Table className="table small">
                    <thead><tr><th>{t("form.from")}</th><th>{t("form.to")}</th><th>{t("form.school")}</th></tr></thead>
                    <tbody>
                      <tr><td className="nums">2017.06</td><td className="nums">2021.03</td><td>Basic Education High School No. 2 Kyauktada (ミャンマー)</td></tr>
                      <tr><td className="nums">2021.12</td><td className="nums nowrap"><span className="hl" style={{ padding: "0 4px" }}>2024.03</span></td><td>University of Nursing, Yangon (ミャンマー)</td></tr>
                    </tbody>
                  </Table>
                </div>
              </div>
              <div>
                <span className="label">{t("form.work")}</span>
                <div className="table-wrap mt-8">
                  <Table className="table small">
                    <thead><tr><th>{t("form.from")}</th><th>{t("form.to")}</th><th>{t("form.company")}</th><th>{t("form.job_desc")}</th></tr></thead>
                    <tbody>
                      <tr><td className="nums">2024.04</td><td className="nums">2025.10</td><td>Shwe Gon Daing Private Hospital (ミャンマー)</td><td>患者の身の回りのお世話、バイタル測定の補助</td></tr>
                      <tr><td className="nums">2025.11</td><td>{t("form.present")}</td><td>Sao Việt Training Center, Yangon (ミャンマー)</td><td>日本語・介護研修</td></tr>
                    </tbody>
                  </Table>
                </div>
              </div>
              <div className="field" style={{ maxWidth: "520px" }}><label htmlFor="currentStatus">{t("form.current_status")}</label><input id="currentStatus" className="input" defaultValue="現在 N3を勉強しています。" /></div>
            </div>
          </section>
          <section className="card">
            <div className="card-header">
              <h3>{t("form.s4")}</h3>
              <span className="badge badge-warning">1 <span>{t("import.to_check")}</span></span>
            </div>
            <div className="card-body stack">
              <div>
                <span className="label">{t("form.licenses")}</span>
                <div className="table-wrap mt-8">
                  <Table className="table small">
                    <thead><tr><th>{t("form.date_obtained")}</th><th>{t("form.qualification")}</th></tr></thead>
                    <tbody>
                      <tr><td className="nums">2024.03</td><td>Nursing diploma, University of Nursing Yangon</td></tr>
                      <tr><td className="nums nowrap"><span className="hl" style={{ padding: "0 4px" }}>2025.12</span></td><td>JLPT N3</td></tr>
                    </tbody>
                  </Table>
                </div>
              </div>
              <div className="form-grid-3">
                <div className="field">
                  <label htmlFor="jlpt"><span>{t("form.jlpt")}</span> {conf("low")}</label>
                  <select id="jlpt" className="select hl" defaultValue="N3"><option>N2</option><option>N3</option><option>N4</option><option>N5</option></select><span className="hint">{t("import.jlpt_hint")}</span>
                </div>
                <div className="field">
                  <label htmlFor="jaLevel">{t("form.ja_level")}</label><input id="jaLevel" className="input" type="number" min="0" max="10" step="0.5" defaultValue="6" /><span className="hint">{t("import.level_hint")}</span>
                </div>
                <div className="field"><label htmlFor="enLevel">{t("form.en_level")}</label><input id="enLevel" className="input" type="number" min="0" max="10" step="0.5" defaultValue="6" /></div>
              </div>
            </div>
          </section>
          <section className="card">
            <div className="card-header"><h3>{t("form.s6")}</h3></div>
            <div className="card-body form-grid-3">
              <div className="field"><label htmlFor="heightCm">{t("form.height")}</label><input id="heightCm" className="input" defaultValue="158" /></div>
              <div className="field"><label htmlFor="weightKg">{t("form.weight")}</label><input id="weightKg" className="input" defaultValue="50" /></div>
              <div className="field">
                <label htmlFor="clothingSize">{t("form.clothing")}</label><select id="clothingSize" className="select" defaultValue="M"><option>S</option><option>M</option><option>L</option></select>
              </div>
              <div className="field"><label htmlFor="shoulderCm">{t("form.shoulder")}</label><input id="shoulderCm" className="input" defaultValue="40" /></div>
              <div className="field"><label htmlFor="waistCm">{t("form.waist")}</label><input id="waistCm" className="input" defaultValue="66" /></div>
              <div className="field"><label htmlFor="shoeCm">{t("form.shoe")}</label><input id="shoeCm" className="input" defaultValue="23" /></div>
              <div className="field span-3"><label htmlFor="religionNotes">{t("form.religion_notes")}</label><input id="religionNotes" className="input" defaultValue="仏教です。特に注意が必要なことはありません。" /></div>
              <div className="field"><label htmlFor="foodRestrictions">{t("form.food")}</label><input id="foodRestrictions" className="input" defaultValue="ありません。" /></div>
              <div className="field"><label htmlFor="allergies">{t("form.allergies")}</label><input id="allergies" className="input" defaultValue="ありません。" /></div>
              <div className="field"><label htmlFor="otherNotes">{t("form.other_notes")}</label><input id="otherNotes" className="input" placeholder="—" /></div>
            </div>
          </section>
          <div className="card-footer between card" style={{ borderRadius: "var(--radius-lg)" }}>
            <button className="btn btn-ghost" type="button">{t("import.save_draft")}</button>
            <div className="row">
              <Link className="btn" href="/candidates/new">{t("common.cancel")}</Link>
              <button className="btn btn-primary" type="submit"><Icon name="check" /><span>{t("import.save")}</span></button>
            </div>
          </div>
        </StaticForm>
      </div>
    </main>
  );
}
