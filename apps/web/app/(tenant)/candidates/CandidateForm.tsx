"use client";

import { CvDraft, cvCompleteness, DOCUMENT_TYPES, JLPT_LEVELS, NATIONALITIES, type VideoStatus } from "@rireki/shared";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import type { z } from "zod";
import { Icon } from "@/components/Icon";
import { ageAt } from "@/components/rirekisho/Rirekisho";
import { StepGo, StepPanel, Stepper, useStepper } from "@/components/Stepper";
import { Table } from "@/components/Table";
import { toast } from "@/components/Toast";
import { compact, countryName, CV_FIELD_LABEL, DOC_TYPE_LABEL, fmtBytes, fmtDuration, missingFields, statusKey, STEP_OF_FIELD, VIDEO_STATUS_LABEL } from "@/lib/candidates/format";
import { FLAGS, STATUS_BADGE } from "@/lib/ui";
import { createCandidate, deleteDocument, deleteVideo, renameVideo, saveDraft, type FieldErrors } from "./actions";
import { Photo } from "./CandidateTable";
import { Uploader } from "./Uploader";

// app/candidate-form.html — the 7-step 履歴書 form for /candidates/new/form and /candidates/[id]/edit. Controlled
// state { cv, tags } validated by CvDraft (autosave 1.5 s after a change) and CvSchema (create / save); field errors
// come back from the Server Actions as error-text under the field. Uploads go through <Uploader/> (media lane routes).

type Draft = z.input<typeof CvDraft>;
export type VideoRow = { id: string; title: string; status: string; durationSec: number | null };
export type DocRow = { id: string; name: string; type: string; size: number };
type Props = {
  id?: string;
  code: string;
  status: string;
  initial: { cv: Draft; tags: string[] };
  videos: VideoRow[];
  documents: DocRow[];
  photoUrl: string | null;
  updatedAt?: string;
  cancelHref: string;
};

type StrKey = "nameKana" | "nameLatin" | "nameNative" | "dob" | "familyDetail" | "mobile" | "email" | "address" | "addressKana" | "currentStatus" | "otherLanguages" | "hobbies" | "motivationPr" | "wishSalary" | "wishLocation" | "wishHours" | "religionNotes" | "foodRestrictions" | "allergies" | "otherNotes";
type NumKey = "familyCount" | "jaLevel" | "enLevel" | "heightCm" | "weightKg" | "shoulderCm" | "waistCm" | "shoeCm";
const LIST_BLANK = { education: { from: "", school: "" }, work: { from: "", employer: "" }, licenses: { date: "", name: "" } } as const;
type ListKey = keyof typeof LIST_BLANK;
type Row = Record<string, unknown>;
type Change = ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
const WISH_DEFAULTS = { wishSalary: "貴社規定に従います。", wishLocation: "全国どこでも大丈夫です。", wishHours: "会社スケジュールで大丈夫です。" } as const;

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Jumps to `step` each time `version` changes (after a failed create/save). Must be rendered inside <Stepper>. */
function StepJumper({ step, version }: { step: number; version: number }) {
  const { go } = useStepper();
  useEffect(() => {
    if (version > 0) go(step);
  }, [step, version, go]);
  return null;
}

function Range({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  return (
    <div className="row-nowrap">
      <input type="range" min={0} max={10} step={0.5} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} style={{ flex: 1 }} />
      <b className="nums" style={{ width: "32px", textAlign: "right" }}>{value ?? "—"}</b>
    </div>
  );
}

const RemoveRow = ({ onClick }: { onClick: () => void }) => (
  <button className="btn btn-ghost btn-icon btn-sm" type="button" aria-label="Remove" onClick={onClick}>
    <Icon name="x" />
  </button>
);

export function CandidateForm({ id: initialId, code: initialCode, status, initial, videos: initialVideos, documents: initialDocs, photoUrl: initialPhoto, updatedAt, cancelHref }: Props) {
  const t = useTranslations();
  const f = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [videos, setVideos] = useState(initialVideos);
  const [documents, setDocuments] = useState(initialDocs);
  const [photoUrl, setPhotoUrl] = useState(initialPhoto);
  const [docType, setDocType] = useState<string>("other");
  const [id, setId] = useState(initialId);
  const [code, setCode] = useState(initialCode);
  const [savedAt, setSavedAt] = useState<Date | null>(updatedAt ? new Date(updatedAt) : null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [jump, setJump] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, start] = useTransition();
  const dataRef = useRef(data);
  const idRef = useRef(initialId);
  const inflight = useRef<Promise<string | undefined> | null>(null);
  const baseline = useRef(JSON.stringify(initial));
  /** A failed autosave or Server Action: ui.error (Next's production message is English and says nothing). */
  const warn = useCallback(() => toast(t("ui.error"), "warn"), [t]);

  // --- autosave -------------------------------------------------------------------------------------------------
  const save = useCallback(async () => {
    const res = await saveDraft({ id: idRef.current, cv: compact(dataRef.current.cv), tags: dataRef.current.tags });
    if (!res.ok) {
      setErrors(res.fieldErrors);
      return idRef.current;
    }
    setSavedAt(new Date(res.updatedAt));
    setCode(res.code);
    if (!idRef.current) {
      idRef.current = res.id;
      setId(res.id);
      // the draft now has a row and a code: continue on its edit URL without remounting the form
      window.history.replaceState(null, "", `/candidates/${res.id}/edit`);
    }
    return res.id;
  }, []);
  const flush = useCallback(
    () =>
      (inflight.current ??= save()
        .catch(() => {
          warn();
          return idRef.current;
        })
        .finally(() => {
          inflight.current = null;
        })),
    [save, warn],
  );
  useEffect(() => {
    dataRef.current = data;
    if (JSON.stringify(data) === baseline.current) return;
    const timer = setTimeout(() => void flush(), 1500);
    return () => clearTimeout(timer);
  }, [data, flush]);
  const ensureId = useCallback(async () => idRef.current ?? (await flush()), [flush]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    start(async () => {
      await inflight.current;
      const res = await createCandidate({ id: idRef.current, cv: compact(dataRef.current.cv), tags: dataRef.current.tags });
      if (!res.ok) {
        setErrors(res.fieldErrors);
        setJump((n) => n + 1);
        return;
      }
      router.push(`/candidates/${res.id}`);
    });
  };

  // --- field helpers --------------------------------------------------------------------------------------------
  const cv = data.cv;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setData((d) => ({ ...d, cv: { ...d.cv, [k]: v } }));
  const text = (k: StrKey) => ({ value: cv[k] ?? "", onChange: (e: Change) => set(k, e.target.value) });
  const num = (k: NumKey) => ({ value: cv[k] ?? "", onChange: (e: Change) => set(k, e.target.value === "" ? undefined : Number(e.target.value)) });
  const bool = (k: "spouse" | "spouseDependency") => ({ value: String(cv[k] ?? false), onChange: (e: Change) => set(k, e.target.value === "true") });
  const rows = (k: ListKey): Row[] => (cv[k] as Row[] | undefined) ?? [];
  const setRows = (k: ListKey, v: Row[]) => set(k, v as unknown as Draft[ListKey]);
  const patchRow = (k: ListKey, i: number, patch: Row) => setRows(k, rows(k).map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const err = (k: string) => errors[k]?.[0];
  const cls = (k: string, base = "input") => (err(k) ? `${base} is-error` : base);
  const errorText = (k: string) => (err(k) ? <span className="error-text">{err(k)}</span> : null);
  const errorStep = Math.min(7, ...Object.keys(errors).map((k) => STEP_OF_FIELD[k] ?? 7));
  const clean = compact(cv) as CvDraft;
  const completeness = cvCompleteness(clean);
  const missing = missingFields(clean);
  const age = ageAt(cv.dob, new Date());
  const title = initialId ? cv.nameNative || cv.nameLatin || code : t("form.title");
  const statusClass = status in STATUS_BADGE ? STATUS_BADGE[status as keyof typeof STATUS_BADGE] : "badge";

  const onVideo = (row: Row, file: File) =>
    setVideos((v) => [...v, { id: str(row.id), title: str(row.title) || file.name, status: str(row.status) || "uploaded", durationSec: typeof row.durationSec === "number" ? row.durationSec : null }]);
  const onDoc = (row: Row, file: File) =>
    setDocuments((d) => [...d, { id: str(row.id), name: str(row.name) || file.name, type: str(row.type) || docType, size: typeof row.size === "number" ? row.size : file.size }]);
  const onPhoto = (row: Row) => (typeof row.url === "string" ? setPhotoUrl(row.url) : router.refresh());
  const removeVideo = (v: VideoRow) => {
    if (!window.confirm(`${t("common.delete")}?`)) return;
    deleteVideo(v.id).then(() => setVideos((list) => list.filter((x) => x.id !== v.id)), warn);
  };
  const removeDoc = (d: DocRow) => {
    if (!window.confirm(`${t("common.delete")}?`)) return;
    deleteDocument(d.id).then(() => setDocuments((list) => list.filter((x) => x.id !== d.id)), warn);
  };
  const addTag = () => {
    const tag = window.prompt(t("form.internal_tags"))?.trim();
    if (tag && !data.tags.includes(tag)) setData((d) => ({ ...d, tags: [...d.tags, tag] }));
  };

  const steps = (["s1", "s2", "s3", "s4", "s5", "s6", "s7"] as const).map((k) => t(`form.${k}`));
  const next = <StepGo className="btn btn-primary" to="next"><span>{t("common.next")}</span><Icon name="arrow-right" /></StepGo>;
  const back = <StepGo className="btn" to="prev"><Icon name="arrow-left" /><span>{t("common.back")}</span></StepGo>;
  const addRow = (k: ListKey) => (
    <button className="btn btn-sm btn-ghost mt-8" type="button" onClick={() => setRows(k, [...rows(k), { ...LIST_BLANK[k] }])}><Icon name="plus" /><span>{t("form.add_row")}</span></button>
  );
  const hm = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } as const;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <p className="sub">
            <span className="mono">{code}</span> · <span className={statusClass}>{t(statusKey(status))}</span>{" "}
            {savedAt && <span className="faint">{t("common.updated")} {f.dateTime(savedAt, hm)}</span>}
          </p>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" type="button" onClick={() => void flush()} disabled={saving}>{t("import.save_draft")}</button>
          <Link className="btn" href={cancelHref}>{t("common.cancel")}</Link>
        </div>
      </div>
      <Stepper steps={steps} ariaLabel="Form steps">
        <StepJumper step={errorStep} version={jump} />
        <form className="stack" onSubmit={submit}>
          <StepPanel step={1}>
            <section className="card">
              <div className="card-header">
                <h2>{t("form.s1")}</h2>
                <span className="small muted">{t("form.req_note")}</span>
              </div>
              <div className="card-body grid-side-main">
                <div className="stack" style={{ gap: "8px" }}>
                  {photoUrl ? (
                    <Photo url={photoUrl} initials="" className="avatar-photo xl" />
                  ) : (
                    <div className="photo-box"><span><Icon name="image" className="ic-lg" style={{ margin: "0 auto 6px" }} /><span>{t("form.photo_hint")}</span></span></div>
                  )}
                  <Uploader kind="photo" candidateId={id} ensureId={ensureId} onDone={onPhoto} className="btn btn-sm">{t("common.upload")}</Uploader>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label className="label" htmlFor="code">{t("cand.code")}</label>
                    <div className="input-group">
                      <span className="addon lead">{code.slice(0, 2)}</span><input id="code" className="input mono" maxLength={6} pattern="[0-9]{6}" inputMode="numeric" value={code.slice(2)} readOnly />
                    </div>
                    <span className="hint">{t("form.code_hint")}</span>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="nationality"><span>{t("cand.nationality")}</span><span className="req">*</span></label>
                    <select id="nationality" name="nationality" className={cls("nationality", "select")} value={cv.nationality ?? ""} onChange={(e) => set("nationality", (e.target.value || undefined) as Draft["nationality"])}>
                      <option value=""></option>
                      {NATIONALITIES.map((n) => <option key={n} value={n}>{FLAGS[n]} {countryName(locale, n)}</option>)}
                    </select>
                    {errorText("nationality")}
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="nameKana"><span>{t("form.name_kana")}</span><span className="req">*</span></label>
                    <div className="input-wrap" style={{ display: "flex" }}>
                      <input id="nameKana" name="nameKana" className={cls("nameKana")} placeholder="グエン・バン・アン" style={{ paddingLeft: "12px", paddingRight: "110px" }} {...text("nameKana")} />
                      {/* TODO(phase2): kana auto-generate */}
                      <button className="btn btn-sm btn-ghost trail" type="button" disabled><Icon name="sparkles" /><span>{t("form.auto_kana")}</span></button>
                    </div>
                    {errorText("nameKana")}
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="nameLatin"><span>{t("form.name_romaji")}</span><span className="req">*</span></label>
                    <input id="nameLatin" name="nameLatin" className={cls("nameLatin")} placeholder="NGUYEN VAN AN" {...text("nameLatin")} />
                    {errorText("nameLatin")}
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="nameNative">{t("form.name_native")}</label>
                    <input id="nameNative" name="nameNative" className={cls("nameNative")} placeholder="Nguyễn Văn An" {...text("nameNative")} />
                    {errorText("nameNative")}
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="dob"><span>{t("form.dob")}</span><span className="req">*</span></label>
                    <div className="row-nowrap">
                      <input id="dob" name="dob" className={cls("dob")} type="date" {...text("dob")} />
                      {age !== null && <span className="badge nowrap">{age} <span>{t("form.years_old")}</span></span>}
                    </div>
                    {errorText("dob")}
                  </div>
                  <div className="field">
                    <label className="label"><span>{t("form.gender")}</span><span className="req">*</span></label>
                    <div className="row" style={{ gap: "16px", height: "38px" }}>
                      <label className="check"><input type="radio" name="gender" value="male" checked={cv.gender === "male"} onChange={() => set("gender", "male")} /><span>{t("gender.m")}</span></label>
                      <label className="check"><input type="radio" name="gender" value="female" checked={cv.gender === "female"} onChange={() => set("gender", "female")} /><span>{t("gender.f")}</span></label>
                    </div>
                    {errorText("gender")}
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="situation">{t("form.status")}</label>
                    <select id="situation" name="situation" className="select" value={cv.situation ?? "job_hunting"} onChange={(e) => set("situation", e.target.value as Draft["situation"])}>
                      <option value="job_hunting">{t("form.status_hunting")}</option><option value="in_training">{t("form.status_training")}</option><option value="employed">{t("form.status_employed")}</option><option value="offer">{t("form.status_offer")}</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="familyCount">{t("form.family_count")}</label>
                    <div className="input-group"><input id="familyCount" name="familyCount" className={cls("familyCount")} type="number" min="1" style={{ maxWidth: "120px" }} {...num("familyCount")} /><span className="addon">人</span></div>
                    {errorText("familyCount")}
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="familyDetail">{t("form.family_detail")}</label>
                    <input id="familyDetail" name="familyDetail" className="input" placeholder="父・母・妹" {...text("familyDetail")} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="spouse">{t("form.spouse")}</label>
                    <select id="spouse" name="spouse" className="select" {...bool("spouse")}><option value="false">{t("common.no")}</option><option value="true">{t("common.yes")}</option></select>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="spouseDependency">{t("form.spouse_dep")}</label>
                    <select id="spouseDependency" name="spouseDependency" className="select" {...bool("spouseDependency")}><option value="false">{t("common.no")}</option><option value="true">{t("common.yes")}</option></select>
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
                  <input id="mobile" name="mobile" className={cls("mobile")} placeholder="+84 912 345 678" {...text("mobile")} />
                  {errorText("mobile")}
                </div>
                <div className="field">
                  <label className="label" htmlFor="email">{t("auth.email")}</label>
                  <input id="email" name="email" className={cls("email")} type="email" placeholder="name@example.com" {...text("email")} />
                  {errorText("email")}
                </div>
                <div className="field span-2">
                  <label className="label" htmlFor="address"><span>{t("form.address")}</span><span className="req">*</span></label>
                  <input id="address" name="address" className={cls("address")} placeholder="Xã Hoằng Tiến, huyện Hoằng Hóa, Thanh Hóa, Việt Nam" {...text("address")} />
                  {errorText("address")}
                </div>
                <div className="field span-2">
                  <label className="label" htmlFor="addressKana">{t("form.address_kana")}</label>
                  <input id="addressKana" name="addressKana" className="input" placeholder="ベトナム　タインホア" {...text("addressKana")} /><span className="hint">{t("form.address_kana_hint")}</span>
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
                        {rows("education").map((r, i) => (
                          <tr key={i}>
                            <td><input className="input input-sm" type="month" value={str(r.from)} onChange={(e) => patchRow("education", i, { from: e.target.value })} aria-label={t("form.from")} /></td>
                            <td><input className="input input-sm" type="month" value={str(r.to)} onChange={(e) => patchRow("education", i, { to: e.target.value })} aria-label={t("form.to")} /></td>
                            <td><input className="input input-sm" value={str(r.school)} onChange={(e) => patchRow("education", i, { school: e.target.value })} aria-label={t("form.school")} /></td>
                            <td><RemoveRow onClick={() => setRows("education", rows("education").filter((_, j) => j !== i))} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  {errorText("education")}
                  {addRow("education")}
                </div>
                <div>
                  <div className="row between mb-8"><span className="label">{t("form.work")}</span><span className="hint">{t("form.work_hint")}</span></div>
                  <div className="table-wrap">
                    <Table className="table">
                      <thead>
                        <tr><th>{t("form.from")}</th><th>{t("form.to")}</th><th>{t("form.company")}</th><th>{t("form.job_desc")}</th><th>{t("form.parttime")}</th><th></th></tr>
                      </thead>
                      <tbody>
                        {rows("work").map((r, i) => (
                          <tr key={i}>
                            <td><input className="input input-sm" type="month" value={str(r.from)} onChange={(e) => patchRow("work", i, { from: e.target.value })} aria-label={t("form.from")} /></td>
                            <td><input className="input input-sm" type="month" value={str(r.to)} onChange={(e) => patchRow("work", i, { to: e.target.value })} placeholder={t("form.present")} aria-label={t("form.to")} /></td>
                            <td><input className="input input-sm" value={str(r.employer)} onChange={(e) => patchRow("work", i, { employer: e.target.value })} aria-label={t("form.company")} /></td>
                            <td><input className="input input-sm" value={str(r.jobDesc)} onChange={(e) => patchRow("work", i, { jobDesc: e.target.value })} aria-label={t("form.job_desc")} /></td>
                            <td><label className="switch"><input type="checkbox" checked={r.partTime === true} onChange={(e) => patchRow("work", i, { partTime: e.target.checked })} /><span className="track"></span></label></td>
                            <td><RemoveRow onClick={() => setRows("work", rows("work").filter((_, j) => j !== i))} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  {errorText("work")}
                  {addRow("work")}
                </div>
                <div className="field" style={{ maxWidth: "560px" }}>
                  <label className="label" htmlFor="currentStatus">{t("form.current_status")}</label>
                  <input id="currentStatus" name="currentStatus" className="input" placeholder={t("form.current_ph")} {...text("currentStatus")} />
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
                        {rows("licenses").map((r, i) => (
                          <tr key={i}>
                            <td><input className="input input-sm" type="month" value={str(r.date)} onChange={(e) => patchRow("licenses", i, { date: e.target.value })} aria-label={t("form.date_obtained")} /></td>
                            <td><input className="input input-sm" value={str(r.name)} onChange={(e) => patchRow("licenses", i, { name: e.target.value })} aria-label={t("form.qualification")} /></td>
                            <td><input className="input input-sm" value={str(r.issuer)} onChange={(e) => patchRow("licenses", i, { issuer: e.target.value })} aria-label={t("form.issuer")} /></td>
                            <td><RemoveRow onClick={() => setRows("licenses", rows("licenses").filter((_, j) => j !== i))} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  {errorText("licenses")}
                  {addRow("licenses")}
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label className="label" htmlFor="jlpt">{t("form.jlpt")}</label>
                    <select id="jlpt" name="jlpt" className="select" value={cv.jlpt ?? "none"} onChange={(e) => set("jlpt", e.target.value as Draft["jlpt"])}>
                      {JLPT_LEVELS.map((l) => <option key={l} value={l}>{l === "none" ? t("common.none") : l}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="otherLanguages">{t("form.other_lang")}</label>
                    <input id="otherLanguages" name="otherLanguages" className="input" placeholder="English (basic)" {...text("otherLanguages")} />
                  </div>
                  <div className="field">
                    <label className="label">{t("form.ja_level")}</label>
                    <Range value={cv.jaLevel} onChange={(v) => set("jaLevel", v)} />
                  </div>
                  <div className="field">
                    <label className="label">{t("form.en_level")}</label>
                    <Range value={cv.enLevel} onChange={(v) => set("enLevel", v)} />
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
                  <textarea id="hobbies" name="hobbies" className="textarea" style={{ minHeight: "70px" }} {...text("hobbies")} />
                </div>
                <div className="field">
                  <div className="row between">
                    <label className="label" htmlFor="motivationPr">{t("form.motivation_pr")}</label>
                    {/* TODO(phase2): machine translation to Japanese */}
                    <button className="btn btn-sm btn-ghost" type="button" disabled><Icon name="languages" /><span>{t("form.translate_ja")}</span></button>
                  </div>
                  <textarea id="motivationPr" name="motivationPr" className="textarea" style={{ minHeight: "150px" }} {...text("motivationPr")} />
                </div>
                <div>
                  <span className="label">{t("form.wishes")}</span>
                  <div className="form-grid-3 mt-8">
                    {(["wishSalary", "wishLocation", "wishHours"] as const).map((k) => (
                      <div className="field" key={k}>
                        <label className="label" htmlFor={k}>{t(k === "wishSalary" ? "form.wish_salary" : k === "wishLocation" ? "form.wish_location" : "form.wish_hours")}</label>
                        <input id={k} name={k} className="input" placeholder={WISH_DEFAULTS[k]} {...text(k)} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="label">{t("form.internal_tags")}</label>
                  <div className="row">
                    {data.tags.map((tag) => (
                      <span className="chip" key={tag}>{tag}<button type="button" aria-label="Remove" onClick={() => setData((d) => ({ ...d, tags: d.tags.filter((x) => x !== tag) }))}><Icon name="x" className="ic-sm" /></button></span>
                    ))}
                    <button className="btn btn-sm btn-ghost" type="button" onClick={addTag}><Icon name="plus" /><span>{t("common.add")}</span></button>
                  </div>
                  {errorText("tags")}
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
                  <div className="field"><label className="label" htmlFor="heightCm">{t("form.height")}</label><input id="heightCm" name="heightCm" className={cls("heightCm")} type="number" {...num("heightCm")} />{errorText("heightCm")}</div>
                  <div className="field"><label className="label" htmlFor="weightKg">{t("form.weight")}</label><input id="weightKg" name="weightKg" className={cls("weightKg")} type="number" {...num("weightKg")} />{errorText("weightKg")}</div>
                  <div className="field">
                    <label className="label" htmlFor="clothingSize">{t("form.clothing")}</label>
                    <select id="clothingSize" name="clothingSize" className="select" value={cv.clothingSize ?? ""} onChange={(e) => set("clothingSize", (e.target.value || undefined) as Draft["clothingSize"])}>
                      <option value=""></option><option>S</option><option>M</option><option>L</option><option>XL</option>
                    </select>
                  </div>
                  <div className="field"><label className="label" htmlFor="shoulderCm">{t("form.shoulder")}</label><input id="shoulderCm" name="shoulderCm" className={cls("shoulderCm")} type="number" {...num("shoulderCm")} />{errorText("shoulderCm")}</div>
                  <div className="field"><label className="label" htmlFor="waistCm">{t("form.waist")}</label><input id="waistCm" name="waistCm" className={cls("waistCm")} type="number" {...num("waistCm")} />{errorText("waistCm")}</div>
                  <div className="field"><label className="label" htmlFor="shoeCm">{t("form.shoe")}</label><input id="shoeCm" name="shoeCm" className={cls("shoeCm")} type="number" {...num("shoeCm")} />{errorText("shoeCm")}</div>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label className="label" htmlFor="religionNotes">{t("form.religion_notes")}</label>
                    <textarea id="religionNotes" name="religionNotes" className="textarea" style={{ minHeight: "70px" }} {...text("religionNotes")} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="foodRestrictions">{t("form.food")}</label>
                    <textarea id="foodRestrictions" name="foodRestrictions" className="textarea" style={{ minHeight: "70px" }} {...text("foodRestrictions")} />
                  </div>
                  <div className="field"><label className="label" htmlFor="allergies">{t("form.allergies")}</label><input id="allergies" name="allergies" className="input" {...text("allergies")} /></div>
                  <div className="field"><label className="label" htmlFor="otherNotes">{t("form.other_notes")}</label><input id="otherNotes" name="otherNotes" className="input" placeholder="—" {...text("otherNotes")} /></div>
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
                  <span>{t("form.completeness")}</span><span className="progress" style={{ width: "120px" }}><i style={{ width: `${completeness}%` }}></i></span><b className="nums">{completeness}%</b>
                </span>
              </div>
              <div className="card-body stack-lg">
                <div>
                  <span className="label">{t("form.videos")}</span>
                  <p className="hint mb-8">{t("form.videos_hint")}</p>
                  <Uploader as="div" kind="video" candidateId={id} ensureId={ensureId} multiple onDone={onVideo} className="dropzone">
                    <Icon name="video" className="ic-xl" /><b>{t("form.drop_video")}</b><span className="small muted">{t("form.drop_video_hint")}</span>
                  </Uploader>
                  {videos.length > 0 && (
                    <div className="stack mt-16" style={{ gap: "8px" }}>
                      {videos.map((v) => (
                        <div className="doc-row" key={v.id}>
                          <Icon name={v.status === "ready" ? "check-circle" : "video"} style={v.status === "ready" ? { color: "var(--success)" } : undefined} />
                          <div className="grow">
                            <div className="n">{v.title}</div>
                            <div className="m">{fmtDuration(v.durationSec)}{v.durationSec !== null && " · "}<span>{t(VIDEO_STATUS_LABEL[v.status as VideoStatus])}</span></div>
                          </div>
                          <input
                            className="input input-sm"
                            style={{ width: "200px" }}
                            aria-label="Title"
                            value={v.title}
                            onChange={(e) => setVideos((list) => list.map((x) => (x.id === v.id ? { ...x, title: e.target.value } : x)))}
                            onBlur={() => v.title.trim() && renameVideo({ id: v.id, title: v.title }).catch(warn)}
                          />
                          <RemoveRow onClick={() => removeVideo(v)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <span className="label">{t("form.documents")}</span>
                  <p className="hint mb-8">{t("form.documents_hint")}</p>
                  <div className="stack" style={{ gap: "8px" }}>
                    {documents.map((d) => (
                      <div className="doc-row" key={d.id}>
                        <Icon name={/\.(jpe?g|png|webp|heic)$/i.test(d.name) ? "image" : "file"} />
                        <div className="grow">
                          <div className="n">{d.name}</div>
                          <div className="m">{fmtBytes(d.size)} · <span>{t(d.type in DOC_TYPE_LABEL ? DOC_TYPE_LABEL[d.type as keyof typeof DOC_TYPE_LABEL] : "common.other")}</span></div>
                        </div>
                        <RemoveRow onClick={() => removeDoc(d)} />
                      </div>
                    ))}
                    <div className="row">
                      <select className="select select-sm" style={{ width: "auto" }} aria-label={t("form.documents")} value={docType} onChange={(e) => setDocType(e.target.value)}>
                        {DOCUMENT_TYPES.map((k) => <option key={k} value={k}>{t(DOC_TYPE_LABEL[k])}</option>)}
                      </select>
                      <Uploader kind="doc" candidateId={id} ensureId={ensureId} extra={{ type: docType }} onDone={onDoc} className="btn btn-sm"><Icon name="plus" /><span>{t("form.add_document")}</span></Uploader>
                    </div>
                  </div>
                </div>
                {missing.length > 0 && (
                  <div className="callout callout-warning">
                    <Icon name="alert" />
                    <div><b>{t("form.missing_t", { count: missing.length })}</b><br /><span>{t("form.missing_d", { fields: missing.map((k) => t(CV_FIELD_LABEL[k])).join(" · ") })}</span></div>
                  </div>
                )}
                <div className="grid grid-2">
                  <div>
                    <div className="row between mb-8"><h3>{t("form.s1")}</h3><StepGo className="btn btn-sm btn-ghost" to={1}>{t("common.edit")}</StepGo></div>
                    <dl className="kv">
                      <dt>{t("cand.code")}</dt><dd className="mono">{code}</dd>
                      <dt>{t("common.name")}</dt><dd>{[cv.nameKana, cv.nameLatin].filter(Boolean).join(" · ")}</dd>
                      <dt>{t("form.dob")}</dt><dd>{cv.dob}{age !== null && ` (${age})`}{cv.gender && <> · <span>{t(cv.gender === "male" ? "gender.m" : "gender.f")}</span></>}</dd>
                      <dt>{t("form.family_count")}</dt><dd>{cv.familyCount !== undefined && `${cv.familyCount}人 · `}<span>{t("form.spouse")}</span>: <span>{t(cv.spouse ? "common.yes" : "common.no")}</span></dd>
                    </dl>
                  </div>
                  <div>
                    <div className="row between mb-8"><h3>{t("form.s4")}</h3><StepGo className="btn btn-sm btn-ghost" to={4}>{t("common.edit")}</StepGo></div>
                    <dl className="kv">
                      <dt>{t("form.licenses")}</dt><dd>{rows("licenses").map((r) => str(r.name)).filter(Boolean).join(" · ")}</dd>
                      <dt>{t("form.ja_level")}</dt><dd>{cv.jaLevel ?? "—"} / 10</dd>
                      <dt>{t("form.en_level")}</dt><dd>{cv.enLevel ?? "—"} / 10</dd>
                    </dl>
                  </div>
                  <div>
                    <div className="row between mb-8"><h3>{t("form.s3")}</h3><StepGo className="btn btn-sm btn-ghost" to={3}>{t("common.edit")}</StepGo></div>
                    <dl className="kv">
                      <dt>{t("form.education")}</dt><dd>{rows("education").length} <span>{t("common.entries")}</span></dd>
                      <dt>{t("form.work")}</dt><dd>{rows("work").length} <span>{t("common.entries")}</span></dd>
                      <dt>{t("form.current_status")}</dt><dd>{cv.currentStatus}</dd>
                    </dl>
                  </div>
                  <div>
                    <div className="row between mb-8"><h3>{t("form.s6")}</h3><StepGo className="btn btn-sm btn-ghost" to={6}>{t("common.edit")}</StepGo></div>
                    <dl className="kv">
                      <dt>{t("form.height")}</dt><dd>{[cv.heightCm && `${cv.heightCm} cm`, cv.weightKg && `${cv.weightKg} kg`, cv.clothingSize].filter(Boolean).join(" · ")}</dd>
                      <dt>{t("form.shoe")}</dt><dd>{cv.shoeCm && `${cv.shoeCm} cm`}</dd>
                      <dt>{t("form.allergies")}</dt><dd>{cv.allergies}</dd>
                    </dl>
                  </div>
                </div>
                <label className="check"><input type="checkbox" name="confirm" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span>{t("form.confirm")}</span></label>
              </div>
              <div className="card-footer between">
                {back}
                <div className="row">
                  <button className="btn" type="button" onClick={() => void flush()} disabled={saving}>{t("import.save_draft")}</button>
                  <button className="btn btn-primary" type="submit" disabled={!confirmed || saving}><Icon name="check" /><span>{t(initialId && status !== "draft" ? "common.save" : "form.create")}</span></button>
                </div>
              </div>
            </section>
          </StepPanel>
        </form>
      </Stepper>
    </>
  );
}
