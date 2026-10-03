"use client";

import { JLPT_LEVELS, NATIONALITIES } from "@rireki/shared";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Table } from "@/components/Table";
import { countryName, pageWindow, statusKey } from "@/lib/candidates/format";
import { FLAGS, STATUS_BADGE } from "@/lib/ui";

/** One row of the picker, pre-shaped by the server page. */
export type PickerRow = {
  id: string;
  code: string;
  name: string;
  kana: string;
  initials: string;
  gender: "m" | "f" | null;
  age: number | null;
  nationality: string | null;
  jlpt: string;
  status: string;
  tags: string[];
  videos: number;
};

const PER = 20;
const JLPT_RANK: Record<string, number> = { N1: 1, N2: 2, N3: 3, N4: 4, N5: 5, none: 9 };

/** Step 1 of app/share-new.html: client-side search/filters over the tenant's candidates, 20 per page, ordered selection aside. */
export function CandidatePicker({ rows, selected, onChange, onNext }: { rows: PickerRow[]; selected: string[]; onChange: (ids: string[]) => void; onNext: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [job, setJob] = useState("");
  const [nationality, setNationality] = useState("");
  const [jlpt, setJlpt] = useState("");
  const [available, setAvailable] = useState(false);
  const [page, setPage] = useState(1);

  const jobs = [...new Set(rows.flatMap((r) => r.tags))].sort();
  const needle = search.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (!needle || [r.code, r.name, r.kana].some((v) => v.toLowerCase().includes(needle))) &&
      (!job || r.tags.includes(job)) &&
      (!nationality || r.nationality === nationality) &&
      (!jlpt || JLPT_RANK[r.jlpt] <= JLPT_RANK[jlpt]) && // "N3+" = N1..N3
      (!available || r.status === "available"),
  );
  const last = Math.max(1, Math.ceil(filtered.length / PER));
  const current = Math.min(page, last);
  const pageRows = filtered.slice((current - 1) * PER, current * PER);
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.includes(r.id));
  const toggle = (id: string, on: boolean) => onChange(on ? [...selected.filter((x) => x !== id), id] : selected.filter((x) => x !== id));
  const picked = selected.map((id) => rows.find((r) => r.id === id)).filter((r): r is PickerRow => !!r);
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };
  const selectStyle = { width: "auto" } as const;

  return (
    <div className="grid grid-main-aside">
      <section className="card">
        <div className="table-toolbar">
          <div className="search input-wrap"><Icon name="search" /><input className="input input-sm" placeholder={t("cand.search_ph")} value={search} onChange={(e) => reset(setSearch)(e.target.value)} /></div>
          <select className="select select-sm" style={selectStyle} value={job} onChange={(e) => reset(setJob)(e.target.value)} aria-label={t("cand.job")}>
            <option value="">{t("cand.job")}</option>
            {jobs.map((j) => <option key={j}>{j}</option>)}
          </select>
          <select className="select select-sm" style={selectStyle} value={nationality} onChange={(e) => reset(setNationality)(e.target.value)} aria-label={t("cand.nationality")}>
            <option value="">{t("cand.nationality")}</option>
            {NATIONALITIES.map((n) => <option key={n} value={n}>{FLAGS[n]} {countryName(locale, n)}</option>)}
          </select>
          <select className="select select-sm" style={selectStyle} value={jlpt} onChange={(e) => reset(setJlpt)(e.target.value)} aria-label="JLPT">
            <option value="">JLPT</option>
            {JLPT_LEVELS.filter((l) => l !== "none").map((l) => <option key={l} value={l}>{l}+</option>)}
          </select>
          <button className={available ? "filter-chip active" : "filter-chip"} type="button" onClick={() => reset(setAvailable)(!available)}><span>{t("status.available")}</span></button>
        </div>
        <div className="table-wrap">
          <Table className="table">
            <thead>
              <tr>
                <th style={{ width: "36px" }}><input type="checkbox" aria-label="Select all" checked={allOnPage} onChange={(e) => onChange(e.target.checked ? [...selected, ...pageRows.filter((r) => !selected.includes(r.id)).map((r) => r.id)] : selected.filter((id) => !pageRows.some((r) => r.id === id)))} /></th>
                <th>{t("cand.candidate")}</th><th>{t("cand.code")}</th><th>{t("cand.gender_age")}</th><th>JLPT</th><th>{t("cand.video")}</th><th>{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((c) => (
                <tr key={c.id}>
                  <td><input type="checkbox" aria-label="Select" checked={selected.includes(c.id)} onChange={(e) => toggle(c.id, e.target.checked)} /></td>
                  <td>
                    <div className="person"><span className="avatar-photo">{c.initials}</span><div><div className="n">{c.name}</div><div className="k">{c.kana}</div></div></div>
                  </td>
                  <td className="mono">{c.code}</td>
                  <td>{c.gender && <span>{t(`gender.${c.gender}`)}</span>}{c.gender && c.age !== null && " · "}{c.age}</td>
                  <td>{c.jlpt !== "none" && <span className="badge badge-primary">{c.jlpt}</span>}</td>
                  <td className="nums" style={c.videos ? undefined : { color: "var(--warning)" }}>{c.videos}</td>
                  <td><span className={c.status in STATUS_BADGE ? STATUS_BADGE[c.status as keyof typeof STATUS_BADGE] : "badge"}>{t(statusKey(c.status))}</span></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        {filtered.length === 0 && <div className="empty"><Icon name="search" /><span>{t("common.none")}</span></div>}
        <div className="pagination">
          <span><span>{t("common.showing")}</span> {filtered.length === 0 ? 0 : (current - 1) * PER + 1}–{Math.min(filtered.length, current * PER)} <span>{t("common.of")}</span> {filtered.length} <span>{t("sharenew.matching")}</span></span>
          <div className="pages">
            {pageWindow(current, last).map((p, i) =>
              p === null ? <span key={`gap${i}`} style={{ padding: "0 4px" }}>…</span> : <button key={p} type="button" className={p === current ? "active" : undefined} onClick={() => setPage(p)}>{p}</button>,
            )}
          </div>
          <span></span>
        </div>
      </section>
      <aside className="stack">
        <section className="card">
          <div className="card-header">
            <h3><span>{t("common.selected")}</span> <span className="badge badge-primary">{picked.length}</span></h3>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => onChange([])} disabled={picked.length === 0}>{t("common.clear")}</button>
          </div>
          <div className="card-body stack" style={{ gap: "8px" }}>
            {picked.map((c) => (
              <div className="row between" key={c.id}>
                <div className="person"><span className="avatar avatar-sm">{c.initials}</span><div><div className="n small">{c.name}</div><div className="k">{c.code}</div></div></div>
                <button className="btn btn-ghost btn-icon btn-sm" type="button" aria-label="Remove" onClick={() => toggle(c.id, false)}><Icon name="x" /></button>
              </div>
            ))}
            {/* TODO(phase2): drag to reorder; the order is the selection order */}
            <p className="hint">{t("sharenew.order_hint")}</p>
          </div>
          <div className="card-footer"><button className="btn btn-primary btn-block" type="button" onClick={onNext} disabled={picked.length === 0}><span>{t("common.next")}</span><Icon name="arrow-right" /></button></div>
        </section>
      </aside>
    </div>
  );
}
