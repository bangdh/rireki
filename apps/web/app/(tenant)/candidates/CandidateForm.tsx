"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { StepGo, StepPanel, Stepper } from "@/components/Stepper";
import { Table } from "@/components/Table";

// app/candidate-form.html — the 7-step 履歴書 form, used by /candidates/new/form and /candidates/[id]/edit.
// TODO(candidates): controlled state validated by CvDraft/CvSchema (zod), autosave draft Server Action, error-text under
// fields, photo/video/document uploads via presigned PUT, dynamic rows. The values below are the mockup's sample.

function Range({ defaultValue }: { defaultValue: number }) {
  const [v, setV] = useState(defaultValue);
  return (
    <div className="row-nowrap">
      <input type="range" min={0} max={10} step={0.5} value={v} onChange={(e) => setV(Number(e.target.value))} style={{ flex: 1 }} />
      <b className="nums" style={{ width: "32px", textAlign: "right" }}>{v}</b>
    </div>
  );
}

const RemoveRow = () => (
  <button className="btn btn-ghost btn-icon btn-sm" type="button" aria-label="Remove">
    <Icon name="x" />
  </button>
);

export function CandidateForm({ prefix, number }: { prefix: string; number: string }) {
  const t = useTranslations();
  const steps = (["s1", "s2", "s3", "s4", "s5", "s6", "s7"] as const).map((k) => t(`form.${k}`));
  const next = (
    <StepGo className="btn btn-primary" to="next"><span>{t("common.next")}</span><Icon name="arrow-right" /></StepGo>
  );
  const back = (
    <StepGo className="btn" to="prev"><Icon name="arrow-left" /><span>{t("common.back")}</span></StepGo>
  );
  const addRow = (
    <button className="btn btn-sm btn-ghost mt-8" type="button"><Icon name="plus" /><span>{t("form.add_row")}</span></button>
  );
  return (
    <Stepper steps={steps} ariaLabel="Form steps">
      <form className="stack" onSubmit={(e) => e.preventDefault()}>
        <StepPanel step={1}>
          <section className="card">
            <div className="card-header">
              <h2>{t("form.s1")}</h2>
              <span className="small muted">{t("form.req_note")}</span>
            </div>
            <div className="card-body grid-side-main">
              <div className="stack" style={{ gap: "8px" }}>
                <div className="photo-box"><span><Icon name="image" className="ic-lg" style={{ margin: "0 auto 6px" }} /><span>{t("form.photo_hint")}</span></span></div>
                <button className="btn btn-sm" type="button">{t("common.upload")}</button>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label className="label" htmlFor="code">{t("cand.code")}</label>
                  <div className="input-group">
                    <span className="addon lead">{prefix}</span><input id="code" className="input mono" maxLength={6} pattern="[0-9]{6}" inputMode="numeric" defaultValue={number} readOnly />
                  </div>
                  <span className="hint">{t("form.code_hint")}</span>
                </div>
                <div className="field">
                  <label className="label" htmlFor="nationality"><span>{t("cand.nationality")}</span><span className="req">*</span></label>
                  <select id="nationality" name="nationality" className="select">
                    <option value="VN">🇻🇳 Vietnam</option><option value="MM">🇲🇲 Myanmar</option><option value="BD">🇧🇩 Bangladesh</option><option value="ID">🇮🇩 Indonesia</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="nameKana"><span>{t("form.name_kana")}</span><span className="req">*</span></label>
                  <div className="input-wrap" style={{ display: "flex" }}>
                    <input id="nameKana" name="nameKana" className="input" placeholder="グエン・バン・アン" style={{ paddingLeft: "12px", paddingRight: "110px" }} />
                    <button className="btn btn-sm btn-ghost trail" type="button"><Icon name="sparkles" /><span>{t("form.auto_kana")}</span></button>
                  </div>
                </div>
                <div className="field">
                  <label className="label" htmlFor="nameLatin"><span>{t("form.name_romaji")}</span><span className="req">*</span></label>
                  <input id="nameLatin" name="nameLatin" className="input" placeholder="NGUYEN VAN AN" />
                </div>
                <div className="field">
                  <label className="label" htmlFor="nameNative">{t("form.name_native")}</label>
                  <input id="nameNative" name="nameNative" className="input" placeholder="Nguyễn Văn An" />
                </div>
                <div className="field">
                  <label className="label" htmlFor="dob"><span>{t("form.dob")}</span><span className="req">*</span></label>
                  <div className="row-nowrap">
                    <input id="dob" name="dob" className="input" type="date" defaultValue="2002-03-15" /><span className="badge nowrap">24 <span>{t("form.years_old")}</span></span>
                  </div>
                </div>
                <div className="field">
                  <label className="label"><span>{t("form.gender")}</span><span className="req">*</span></label>
                  <div className="row" style={{ gap: "16px", height: "38px" }}>
                    <label className="check"><input type="radio" name="gender" value="male" defaultChecked /><span>{t("gender.m")}</span></label>
                    <label className="check"><input type="radio" name="gender" value="female" /><span>{t("gender.f")}</span></label>
                  </div>
                </div>
                <div className="field">
                  <label className="label" htmlFor="situation">{t("form.status")}</label>
                  <select id="situation" name="situation" className="select">
                    <option value="job_hunting">{t("form.status_hunting")}</option><option value="in_training">{t("form.status_training")}</option><option value="employed">{t("form.status_employed")}</option><option value="offer">{t("form.status_offer")}</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="familyCount">{t("form.family_count")}</label>
                  <div className="input-group"><input id="familyCount" name="familyCount" className="input" type="number" min="1" style={{ maxWidth: "120px" }} defaultValue="4" /><span className="addon">人</span></div>
                </div>
                <div className="field">
                  <label className="label" htmlFor="familyDetail">{t("form.family_detail")}</label>
                  <input id="familyDetail" name="familyDetail" className="input" placeholder="父・母・妹" />
                </div>
                <div className="field">
                  <label className="label" htmlFor="spouse">{t("form.spouse")}</label>
                  <select id="spouse" name="spouse" className="select"><option value="false">{t("common.no")}</option><option value="true">{t("common.yes")}</option></select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="spouseDependency">{t("form.spouse_dep")}</label>
                  <select id="spouseDependency" name="spouseDependency" className="select"><option value="false">{t("common.no")}</option><option value="true">{t("common.yes")}</option></select>
                </div>
              </div>
            </div>
            <div className="card-footer between">
              <span className="small faint">{t("form.step_of")}</span>{next}
            </div>
          </section>
        </StepPanel>
        <StepPanel step={2}>
          <section className="card">
            <div className="card-header"><h2>{t("form.s2")}</h2></div>
            <div className="card-body form-grid">
              <div className="field">
                <label className="label" htmlFor="mobile"><span>{t("form.mobile")}</span><span className="req">*</span></label>
                <input id="mobile" name="mobile" className="input" placeholder="+84 912 345 678" />
              </div>
              <div className="field">
                <label className="label" htmlFor="email">{t("auth.email")}</label>
                <input id="email" name="email" className="input" type="email" placeholder="name@example.com" />
              </div>
              <div className="field span-2">
                <label className="label" htmlFor="address"><span>{t("form.address")}</span><span className="req">*</span></label>
                <input id="address" name="address" className="input" placeholder="Xã Hoằng Tiến, huyện Hoằng Hóa, Thanh Hóa, Việt Nam" />
              </div>
              <div className="field span-2">
                <label className="label" htmlFor="addressKana">{t("form.address_kana")}</label>
                <input id="addressKana" name="addressKana" className="input" placeholder="ベトナム　タインホア" /><span className="hint">{t("form.address_kana_hint")}</span>
              </div>
            </div>
            <div className="card-footer between">{back}{next}</div>
          </section>
        </StepPanel>
        <StepPanel step={3}>
          <section className="card">
            <div className="card-header">
              <h2>{t("form.s3")}</h2>
              <span className="small muted">{t("form.chrono")}</span>
            </div>
            <div className="card-body stack-lg">
              <div>
                <div className="row between mb-8"><span className="label">{t("form.education")}</span><span className="hint">{t("form.edu_hint")}</span></div>
                <div className="table-wrap">
                  <Table className="table">
                    <thead>
                      <tr><th>{t("form.from")}</th><th>{t("form.to")}</th><th>{t("form.school")}</th><th></th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><input className="input input-sm" type="month" defaultValue="2017-09" aria-label={t("form.from")} /></td>
                        <td><input className="input input-sm" type="month" defaultValue="2020-06" aria-label={t("form.to")} /></td>
                        <td><input className="input input-sm" defaultValue="Trường THPT Hoằng Hóa 2 (Việt Nam)" aria-label={t("form.school")} /></td>
                        <td><RemoveRow /></td>
                      </tr>
                      <tr>
                        <td><input className="input input-sm" type="month" defaultValue="2020-09" aria-label={t("form.from")} /></td>
                        <td><input className="input input-sm" type="month" defaultValue="2022-06" aria-label={t("form.to")} /></td>
                        <td><input className="input input-sm" defaultValue="Cao đẳng nghề Thanh Hóa – Hàn (Việt Nam)" aria-label={t("form.school")} /></td>
                        <td><RemoveRow /></td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
                {addRow}
              </div>
              <div>
                <div className="row between mb-8"><span className="label">{t("form.work")}</span><span className="hint">{t("form.work_hint")}</span></div>
                <div className="table-wrap">
                  <Table className="table">
                    <thead>
                      <tr><th>{t("form.from")}</th><th>{t("form.to")}</th><th>{t("form.company")}</th><th>{t("form.job_desc")}</th><th>{t("form.parttime")}</th><th></th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><input className="input input-sm" type="month" defaultValue="2022-08" aria-label={t("form.from")} /></td>
                        <td><input className="input input-sm" type="month" defaultValue="2024-05" aria-label={t("form.to")} /></td>
                        <td><input className="input input-sm" defaultValue="Công ty TNHH Cơ khí Minh Phát (Việt Nam)" aria-label={t("form.company")} /></td>
                        <td><input className="input input-sm" defaultValue="MIG/TIG welding of steel frames, drawing checks" aria-label={t("form.job_desc")} /></td>
                        <td><label className="switch"><input type="checkbox" /><span className="track"></span></label></td>
                        <td><RemoveRow /></td>
                      </tr>
                      <tr>
                        <td><input className="input input-sm" type="month" defaultValue="2024-06" aria-label={t("form.from")} /></td>
                        <td><input className="input input-sm" type="month" placeholder={t("form.present")} aria-label={t("form.to")} /></td>
                        <td><input className="input input-sm" defaultValue="Sao Việt Training Center (Việt Nam)" aria-label={t("form.company")} /></td>
                        <td><input className="input input-sm" defaultValue="Japanese lessons, welding practice" aria-label={t("form.job_desc")} /></td>
                        <td><label className="switch"><input type="checkbox" /><span className="track"></span></label></td>
                        <td><RemoveRow /></td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
                {addRow}
              </div>
              <div className="field" style={{ maxWidth: "560px" }}>
                <label className="label" htmlFor="currentStatus">{t("form.current_status")}</label>
                <input id="currentStatus" name="currentStatus" className="input" defaultValue="現在 N3を勉強しています。" placeholder={t("form.current_ph")} />
              </div>
            </div>
            <div className="card-footer between">{back}{next}</div>
          </section>
        </StepPanel>
        <StepPanel step={4}>
          <section className="card">
            <div className="card-header"><h2>{t("form.s4")}</h2></div>
            <div className="card-body stack-lg">
              <div>
                <span className="label">{t("form.licenses")}</span>
                <div className="table-wrap mt-8">
                  <Table className="table">
                    <thead>
                      <tr><th>{t("form.date_obtained")}</th><th>{t("form.qualification")}</th><th>{t("form.issuer")}</th><th></th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><input className="input input-sm" type="month" defaultValue="2023-04" aria-label={t("form.date_obtained")} /></td>
                        <td><input className="input input-sm" defaultValue="溶接技能証明書 3G" aria-label={t("form.qualification")} /></td>
                        <td><input className="input input-sm" defaultValue="Thanh Hóa Vocational College" aria-label={t("form.issuer")} /></td>
                        <td><RemoveRow /></td>
                      </tr>
                      <tr>
                        <td><input className="input input-sm" type="month" defaultValue="2025-12" aria-label={t("form.date_obtained")} /></td>
                        <td><input className="input input-sm" defaultValue="JLPT N4" aria-label={t("form.qualification")} /></td>
                        <td><input className="input input-sm" defaultValue="Japan Foundation" aria-label={t("form.issuer")} /></td>
                        <td><RemoveRow /></td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
                {addRow}
              </div>
              <div className="form-grid">
                <div className="field">
                  <label className="label" htmlFor="jlpt">{t("form.jlpt")}</label>
                  <select id="jlpt" name="jlpt" className="select" defaultValue="N4">
                    <option>N1</option><option>N2</option><option>N3</option><option>N4</option><option>N5</option><option value="none">{t("common.none")}</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="otherLanguages">{t("form.other_lang")}</label>
                  <input id="otherLanguages" name="otherLanguages" className="input" placeholder="English (basic)" />
                </div>
                <div className="field">
                  <label className="label">{t("form.ja_level")}</label>
                  <Range defaultValue={5} />
                </div>
                <div className="field">
                  <label className="label">{t("form.en_level")}</label>
                  <Range defaultValue={3} />
                </div>
                <p className="hint span-2">{t("form.level_hint")}</p>
              </div>
            </div>
            <div className="card-footer between">{back}{next}</div>
          </section>
        </StepPanel>
        <StepPanel step={5}>
          <section className="card">
            <div className="card-header"><h2>{t("form.s5")}</h2></div>
            <div className="card-body stack-lg">
              <div className="field">
                <label className="label" htmlFor="hobbies">{t("form.hobbies")}</label>
                <textarea id="hobbies" name="hobbies" className="textarea" style={{ minHeight: "70px" }} defaultValue="趣味は料理とサッカーです。お客様や仲間とのコミュニケーションを大切にし、相手の立場に立って行動することが得意です。" />
              </div>
              <div className="field">
                <div className="row between">
                  <label className="label" htmlFor="motivationPr">{t("form.motivation_pr")}</label>
                  <button className="btn btn-sm btn-ghost" type="button"><Icon name="languages" /><span>{t("form.translate_ja")}</span></button>
                </div>
                <textarea id="motivationPr" name="motivationPr" className="textarea" style={{ minHeight: "150px" }} defaultValue="専門学校で溶接を学び、2年間の実務でMIG/TIG溶接を担当してきました。前職では月間の不良率を3%から1%に改善しました。日本の高い品質基準の中で技術を磨き、将来はベトナムで技術者として働きたいと考えています。真面目で体力に自信があり、チームで協力して働くことが好きです。どうぞよろしくお願い致します。" />
              </div>
              <div>
                <span className="label">{t("form.wishes")}</span>
                <div className="form-grid-3 mt-8">
                  <div className="field"><label className="label" htmlFor="wishSalary">{t("form.wish_salary")}</label><input id="wishSalary" name="wishSalary" className="input" defaultValue="貴社規定に従います。" /></div>
                  <div className="field"><label className="label" htmlFor="wishLocation">{t("form.wish_location")}</label><input id="wishLocation" name="wishLocation" className="input" defaultValue="全国どこでも大丈夫です。" /></div>
                  <div className="field"><label className="label" htmlFor="wishHours">{t("form.wish_hours")}</label><input id="wishHours" name="wishHours" className="input" defaultValue="会社スケジュールで大丈夫です。" /></div>
                </div>
              </div>
              <div className="field">
                <label className="label">{t("form.internal_tags")}</label>
                <div className="row">
                  <span className="chip">溶接<button type="button" aria-label="Remove"><Icon name="x" className="ic-sm" /></button></span>
                  <span className="chip">機械加工<button type="button" aria-label="Remove"><Icon name="x" className="ic-sm" /></button></span>
                  <button className="btn btn-sm btn-ghost" type="button"><Icon name="plus" /><span>{t("common.add")}</span></button>
                </div>
              </div>
            </div>
            <div className="card-footer between">{back}{next}</div>
          </section>
        </StepPanel>
        <StepPanel step={6}>
          <section className="card">
            <div className="card-header"><h2>{t("form.s6")}</h2></div>
            <div className="card-body stack-lg">
              <div className="form-grid-3">
                <div className="field"><label className="label" htmlFor="heightCm">{t("form.height")}</label><input id="heightCm" name="heightCm" className="input" type="number" defaultValue="168" /></div>
                <div className="field"><label className="label" htmlFor="weightKg">{t("form.weight")}</label><input id="weightKg" name="weightKg" className="input" type="number" defaultValue="61" /></div>
                <div className="field">
                  <label className="label" htmlFor="clothingSize">{t("form.clothing")}</label>
                  <select id="clothingSize" name="clothingSize" className="select" defaultValue="M"><option>S</option><option>M</option><option>L</option><option>XL</option></select>
                </div>
                <div className="field"><label className="label" htmlFor="shoulderCm">{t("form.shoulder")}</label><input id="shoulderCm" name="shoulderCm" className="input" type="number" defaultValue="46" /></div>
                <div className="field"><label className="label" htmlFor="waistCm">{t("form.waist")}</label><input id="waistCm" name="waistCm" className="input" type="number" defaultValue="78" /></div>
                <div className="field"><label className="label" htmlFor="shoeCm">{t("form.shoe")}</label><input id="shoeCm" name="shoeCm" className="input" type="number" defaultValue="26" /></div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label className="label" htmlFor="religionNotes">{t("form.religion_notes")}</label>
                  <textarea id="religionNotes" name="religionNotes" className="textarea" style={{ minHeight: "70px" }} defaultValue="仏教です。特に注意が必要なことはありません。" />
                </div>
                <div className="field">
                  <label className="label" htmlFor="foodRestrictions">{t("form.food")}</label>
                  <textarea id="foodRestrictions" name="foodRestrictions" className="textarea" style={{ minHeight: "70px" }} defaultValue="ありません。なんでも食べられます。" />
                </div>
                <div className="field"><label className="label" htmlFor="allergies">{t("form.allergies")}</label><input id="allergies" name="allergies" className="input" defaultValue="ありません。" /></div>
                <div className="field"><label className="label" htmlFor="otherNotes">{t("form.other_notes")}</label><input id="otherNotes" name="otherNotes" className="input" placeholder="—" /></div>
              </div>
            </div>
            <div className="card-footer between">{back}{next}</div>
          </section>
        </StepPanel>
        <StepPanel step={7}>
          <section className="card">
            <div className="card-header">
              <h2>{t("form.s7")}</h2>
              <span className="row-nowrap small">
                <span>{t("form.completeness")}</span><span className="progress" style={{ width: "120px" }}><i style={{ width: "92%" }}></i></span><b className="nums">92%</b>
              </span>
            </div>
            <div className="card-body stack-lg">
              <div>
                <span className="label">{t("form.videos")}</span>
                <p className="hint mb-8">{t("form.videos_hint")}</p>
                <div className="dropzone"><Icon name="video" className="ic-xl" /><b>{t("form.drop_video")}</b><span className="small muted">{t("form.drop_video_hint")}</span></div>
                <div className="stack mt-16" style={{ gap: "8px" }}>
                  <div className="doc-row">
                    <Icon name="video" />
                    <div className="grow">
                      <div className="n">自己紹介（日本語）.mp4</div>
                      <div className="m">1:32 · 84 MB · <span>{t("form.processing")}</span></div>
                      <div className="progress mt-8" style={{ maxWidth: "280px" }}><i style={{ width: "62%" }}></i></div>
                    </div>
                    <input className="input input-sm" style={{ width: "200px" }} aria-label="Title" defaultValue="自己紹介 (Japanese)" />
                    <RemoveRow />
                  </div>
                  <div className="doc-row">
                    <Icon name="check-circle" style={{ color: "var(--success)" }} />
                    <div className="grow">
                      <div className="n">welding_demo.mov</div>
                      <div className="m">2:45 · 210 MB · <span>{t("common.ready")}</span></div>
                    </div>
                    <input className="input input-sm" style={{ width: "200px" }} aria-label="Title" defaultValue="溶接実技デモ" />
                    <RemoveRow />
                  </div>
                </div>
              </div>
              <div>
                <span className="label">{t("form.documents")}</span>
                <p className="hint mb-8">{t("form.documents_hint")}</p>
                <div className="stack" style={{ gap: "8px" }}>
                  <div className="doc-row">
                    <Icon name="file" />
                    <div className="grow">
                      <div className="n">passport_scan.pdf</div>
                      <div className="m">1.1 MB · <span>{t("form.doc_passport")}</span></div>
                    </div>
                    <RemoveRow />
                  </div>
                  <div className="doc-row">
                    <Icon name="file" />
                    <div className="grow">
                      <div className="n">JLPT_N4_certificate.jpg</div>
                      <div className="m">640 KB · <span>{t("form.doc_cert")}</span></div>
                    </div>
                    <RemoveRow />
                  </div>
                  <button className="btn btn-sm" type="button" style={{ alignSelf: "flex-start" }}><Icon name="plus" /><span>{t("form.add_document")}</span></button>
                </div>
              </div>
              <div className="callout callout-warning">
                <Icon name="alert" />
                <div><b>{t("form.missing_t")}</b><br /><span>{t("form.missing_d")}</span></div>
              </div>
              <div className="grid grid-2">
                <div>
                  <div className="row between mb-8"><h3>{t("form.s1")}</h3><StepGo className="btn btn-sm btn-ghost" to={1}>{t("common.edit")}</StepGo></div>
                  <dl className="kv">
                    <dt>{t("cand.code")}</dt><dd className="mono">{prefix}{number}</dd>
                    <dt>{t("common.name")}</dt><dd>グエン・バン・アン · NGUYEN VAN AN</dd>
                    <dt>{t("form.dob")}</dt><dd>2002-03-15 (24) · <span>{t("gender.m")}</span></dd>
                    <dt>{t("form.family_count")}</dt><dd>4人 · <span>{t("form.spouse")}</span>: <span>{t("common.no")}</span></dd>
                  </dl>
                </div>
                <div>
                  <div className="row between mb-8"><h3>{t("form.s4")}</h3><StepGo className="btn btn-sm btn-ghost" to={4}>{t("common.edit")}</StepGo></div>
                  <dl className="kv">
                    <dt>{t("form.licenses")}</dt><dd>溶接技能証明書 3G · JLPT N4</dd>
                    <dt>{t("form.ja_level")}</dt><dd>5 / 10</dd>
                    <dt>{t("form.en_level")}</dt><dd>3 / 10</dd>
                  </dl>
                </div>
                <div>
                  <div className="row between mb-8"><h3>{t("form.s3")}</h3><StepGo className="btn btn-sm btn-ghost" to={3}>{t("common.edit")}</StepGo></div>
                  <dl className="kv">
                    <dt>{t("form.education")}</dt><dd>2 <span>{t("common.entries")}</span></dd>
                    <dt>{t("form.work")}</dt><dd>2 <span>{t("common.entries")}</span></dd>
                    <dt>{t("form.current_status")}</dt><dd>現在 N3を勉強しています。</dd>
                  </dl>
                </div>
                <div>
                  <div className="row between mb-8"><h3>{t("form.s6")}</h3><StepGo className="btn btn-sm btn-ghost" to={6}>{t("common.edit")}</StepGo></div>
                  <dl className="kv"><dt>{t("form.height")}</dt><dd>168 cm · 61 kg · M</dd><dt>{t("form.shoe")}</dt><dd>26 cm</dd><dt>{t("form.allergies")}</dt><dd>ありません。</dd></dl>
                </div>
              </div>
              <label className="check"><input type="checkbox" name="confirm" /><span>{t("form.confirm")}</span></label>
            </div>
            <div className="card-footer between">
              {back}
              <div className="row">
                <button className="btn" type="button">{t("import.save_draft")}</button>
                <button className="btn btn-primary" type="submit"><Icon name="check" /><span>{t("form.create")}</span></button>
              </div>
            </div>
          </section>
        </StepPanel>
      </form>
    </Stepper>
  );
}
