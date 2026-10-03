"use client";

import { JLPT_LEVELS, NATIONALITIES, type CvDraft } from "@rireki/shared";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState, type InputHTMLAttributes } from "react";
import { Icon } from "@/components/Icon";
import { Table } from "@/components/Table";
import { countryName } from "@/lib/candidates/format";
import { CARRIED, LOW_CONFIDENCE, sectionCounts } from "@/lib/extraction/form";
import { FLAGS } from "@/lib/ui";
import { saveCandidate, type SaveState } from "./actions";

type Props = { jobId: string; cv: CvDraft; confidence: Record<string, number>; kanaGenerated: boolean; codePrefix: string; nextCode: number };
type StrKey = "nameKana" | "nameLatin" | "nameNative" | "dob" | "mobile" | "email" | "address" | "addressKana" | "currentStatus" | "religionNotes" | "foodRestrictions" | "allergies" | "otherNotes";
type NumKey = "familyCount" | "jaLevel" | "enLevel" | "heightCm" | "weightKg" | "shoulderCm" | "waistCm" | "shoeCm";
type SelKey = "gender" | "nationality" | "situation" | "spouse" | "jlpt" | "clothingSize";

const ym = (s: string) => s.replace("-", ".");

/**
 * The <form> of app/candidate-import.html: every scalar field is an uncontrolled input named after its cv key, a field whose
 * confidence is below 0.85 gets the yellow `hl` input and the `conf low` chip, the history tables are read-only and posted
 * as hidden JSON; fields it does not show (CARRIED) are posted as hidden inputs. A katakana name Claude generated from the
 * romanized one gets the mockup's import.kana_hint. Submits to saveCandidate (intent save | draft); field errors show as
 * error-text under the field.
 */
export function ReviewForm({ jobId, cv, confidence, kanaGenerated, codePrefix, nextCode }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(saveCandidate.bind(null, jobId), {} as SaveState);
  const errors = state.errors ?? {};
  const counts = sectionCounts(confidence);

  // After a failed save React resets the uncontrolled inputs: the action echoes the submitted values back as the new defaults.
  const val = (key: keyof CvDraft) => state.values?.[key] ?? (cv[key] === undefined ? "" : String(cv[key]));
  const low = (key: string) => (confidence[key] ?? 1) < LOW_CONFIDENCE;
  const chip = (key: string) => key in confidence && <span className={`conf ${low(key) ? "low" : "high"}`}>{t(low(key) ? "import.conf_low" : "import.conf_high")}</span>;
  const cls = (key: string, base = "input") => (low(key) ? `${base} hl` : base);
  const err = (key: string) => errors[key] && <span className="error-text">{errors[key]}</span>;
  const label = (key: string, text: string) => <label htmlFor={key}><span>{text}</span> {chip(key)}</label>;
  const badge = (section: number) => (counts[section] ? <span className="badge badge-warning">{counts[section]} <span>{t("import.to_check")}</span></span> : null);

  const text = (key: StrKey, text: string, type: "text" | "date" = "text", hint?: string) => (
    <div className="field">
      {label(key, text)}
      <input id={key} name={key} className={cls(key)} type={type} defaultValue={val(key)} />
      {hint && <span className="hint">{hint}</span>}
      {err(key)}
    </div>
  );
  const number = (key: NumKey, text: string, extra: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field">
      {label(key, text)}
      <input id={key} name={key} className={cls(key)} type="number" step="any" defaultValue={val(key)} {...extra} />
      {err(key)}
    </div>
  );
  const select = (key: SelKey, text: string, options: ReadonlyArray<readonly [string, string]>) => (
    <div className="field">
      {label(key, text)}
      <select id={key} name={key} className={cls(key, "select")} defaultValue={val(key)}>
        {options.map(([value, option]) => <option key={value} value={value}>{option}</option>)}
      </select>
      {err(key)}
    </div>
  );
  const none = <tr><td colSpan={4} className="muted">{t("common.none")}</td></tr>;
  const education = cv.education ?? [];
  const work = cv.work ?? [];
  const licenses = cv.licenses ?? [];

  return (
    <form className="stack" action={formAction}>
      {CARRIED.map((key) => cv[key] !== undefined && <input key={key} type="hidden" name={key} defaultValue={String(cv[key])} />)}
      <section className="card">
        <div className="card-header"><h3>{t("form.s1")}</h3>{badge(1)}</div>
        <div className="card-body form-grid">
          <div className="field">
            <label htmlFor="code">{t("cand.code")}</label>
            <div className="input-group"><span className="addon lead">{codePrefix}</span><input id="code" className="input mono" maxLength={6} inputMode="numeric" defaultValue={String(nextCode).padStart(6, "0")} readOnly /></div>
            <span className="hint">{t("import.code_auto")}</span>
          </div>
          {text("nameKana", t("form.name_kana"), "text", kanaGenerated ? t("import.kana_hint") : undefined)}
          {text("nameLatin", t("form.name_romaji"))}
          {text("nameNative", t("form.name_native"))}
          {text("dob", t("form.dob"), "date")}
          {select("gender", t("form.gender"), [["", ""], ["female", t("gender.f")], ["male", t("gender.m")]])}
          {select("nationality", t("cand.nationality"), [["", ""], ...NATIONALITIES.map((n) => [n, `${FLAGS[n]} ${countryName(locale, n)}`] as const)])}
          {select("situation", t("form.status"), [["job_hunting", t("form.status_hunting")], ["in_training", t("form.status_training")], ["employed", t("form.status_employed")], ["offer", t("form.status_offer")]])}
          <div className="field">
            {label("familyCount", t("form.family_count"))}
            <div className="input-group"><input id="familyCount" name="familyCount" className={cls("familyCount")} type="number" min="1" style={{ maxWidth: "120px" }} defaultValue={val("familyCount")} /><span className="addon">人</span></div>
            {err("familyCount")}
          </div>
          {select("spouse", t("form.spouse"), [["false", t("common.no")], ["true", t("common.yes")]])}
        </div>
      </section>

      <section className="card">
        <div className="card-header"><h3>{t("form.s2")}</h3>{badge(2)}</div>
        <div className="card-body form-grid">
          {text("mobile", t("form.mobile"))}
          {text("email", t("auth.email"))}
          {text("address", t("form.address"))}
          {text("addressKana", t("form.address_kana"))}
        </div>
      </section>

      <section className="card">
        <div className="card-header"><h3>{t("form.s3")}</h3>{badge(3)}</div>
        <div className="card-body stack">
          <div>
            <span className="label">{t("form.education")}</span> {chip("education")}
            <div className={`table-wrap mt-8${low("education") ? " hl" : ""}`}>
              <Table className="table small">
                <thead><tr><th>{t("form.from")}</th><th>{t("form.to")}</th><th>{t("form.school")}</th></tr></thead>
                <tbody>
                  {education.length === 0 && none}
                  {education.map((r, i) => <tr key={i}><td className="nums">{ym(r.from)}</td><td className="nums">{r.to ? ym(r.to) : t("form.present")}</td><td>{r.school}</td></tr>)}
                </tbody>
              </Table>
            </div>
            <input type="hidden" name="education" defaultValue={JSON.stringify(education)} />
            {err("education")}
          </div>
          <div>
            <span className="label">{t("form.work")}</span> {chip("work")}
            <div className={`table-wrap mt-8${low("work") ? " hl" : ""}`}>
              <Table className="table small">
                <thead><tr><th>{t("form.from")}</th><th>{t("form.to")}</th><th>{t("form.company")}</th><th>{t("form.job_desc")}</th></tr></thead>
                <tbody>
                  {work.length === 0 && none}
                  {work.map((r, i) => <tr key={i}><td className="nums">{ym(r.from)}</td><td className="nums">{r.to ? ym(r.to) : t("form.present")}</td><td>{r.employer}</td><td>{r.jobDesc}</td></tr>)}
                </tbody>
              </Table>
            </div>
            <input type="hidden" name="work" defaultValue={JSON.stringify(work)} />
            {err("work")}
          </div>
          <div className="field" style={{ maxWidth: "520px" }}>
            {label("currentStatus", t("form.current_status"))}
            <input id="currentStatus" name="currentStatus" className={cls("currentStatus")} defaultValue={val("currentStatus")} />
            {err("currentStatus")}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header"><h3>{t("form.s4")}</h3>{badge(4)}</div>
        <div className="card-body stack">
          <div>
            <span className="label">{t("form.licenses")}</span> {chip("licenses")}
            <div className={`table-wrap mt-8${low("licenses") ? " hl" : ""}`}>
              <Table className="table small">
                <thead><tr><th>{t("form.date_obtained")}</th><th>{t("form.qualification")}</th></tr></thead>
                <tbody>
                  {licenses.length === 0 && none}
                  {licenses.map((r, i) => <tr key={i}><td className="nums">{ym(r.date)}</td><td>{r.name}</td></tr>)}
                </tbody>
              </Table>
            </div>
            <input type="hidden" name="licenses" defaultValue={JSON.stringify(licenses)} />
            {err("licenses")}
          </div>
          <div className="form-grid-3">
            {select("jlpt", t("form.jlpt"), JLPT_LEVELS.map((l) => [l, l === "none" ? t("common.none") : l] as const))}
            <div className="field">
              {label("jaLevel", t("form.ja_level"))}
              <input id="jaLevel" name="jaLevel" className={cls("jaLevel")} type="number" min="0" max="10" step="0.5" defaultValue={val("jaLevel")} />
              <span className="hint">{t("import.level_hint")}</span>
              {err("jaLevel")}
            </div>
            {number("enLevel", t("form.en_level"), { min: 0, max: 10, step: 0.5 })}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header"><h3>{t("form.s6")}</h3>{badge(6)}</div>
        <div className="card-body form-grid-3">
          {number("heightCm", t("form.height"))}
          {number("weightKg", t("form.weight"))}
          {select("clothingSize", t("form.clothing"), [["", ""], ["S", "S"], ["M", "M"], ["L", "L"], ["XL", "XL"]])}
          {number("shoulderCm", t("form.shoulder"))}
          {number("waistCm", t("form.waist"))}
          {number("shoeCm", t("form.shoe"))}
          <div className="field span-3">
            {label("religionNotes", t("form.religion_notes"))}
            <input id="religionNotes" name="religionNotes" className={cls("religionNotes")} defaultValue={val("religionNotes")} />
            {err("religionNotes")}
          </div>
          {text("foodRestrictions", t("form.food"))}
          {text("allergies", t("form.allergies"))}
          {text("otherNotes", t("form.other_notes"))}
        </div>
      </section>

      <div className="card-footer between card" style={{ borderRadius: "var(--radius-lg)" }}>
        <button className="btn btn-ghost" type="submit" name="intent" value="draft" disabled={pending}>{t("import.save_draft")}</button>
        <div className="row">
          <Link className="btn" href="/candidates/import">{t("common.cancel")}</Link>
          <button className="btn btn-primary" type="submit" name="intent" value="save" disabled={pending}><Icon name="check" /><span>{t("import.save")}</span></button>
        </div>
      </div>
    </form>
  );
}
