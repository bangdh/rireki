"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { Menu } from "@/components/Menu";
import { Table } from "@/components/Table";
import { toast } from "@/components/Toast";
import { shareHref } from "@/lib/candidates/format";
import { addTag, archiveCandidates, duplicateCandidate } from "./actions";

/** One list row, pre-localized by the server page (dates, gender, status, country). */
export type Row = {
  id: string;
  code: string;
  name: string;
  kana: string;
  initials: string;
  photoUrl: string | null;
  nationality: string | null;
  flag: string;
  country: string;
  gender: string;
  age: number | null;
  tags: string[];
  jlpt: string;
  videos: number;
  status: string;
  statusClass: string;
  updated: string;
};

/** Candidate photo (presigned URL) or the initials placeholder, same classes as the mockup. */
export function Photo({ url, initials, className = "avatar-photo" }: { url: string | null; initials: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- short-lived presigned S3 URL
  return url ? <img className={className} src={url} alt="" style={{ objectFit: "cover" }} /> : <span className={className}>{initials}</span>;
}

/** app/candidates.html table: selection state, bulk bar (hidden when nothing is selected) and the row actions. */
export function CandidateTable({ rows, isAdmin }: { rows: Row[]; isAdmin: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const all = rows.length > 0 && selected.length === rows.length;

  const run = (fn: () => Promise<unknown>, done?: () => void) =>
    start(async () => {
      try {
        await fn();
        done?.();
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e), "warn");
      }
    });
  const toggle = (id: string, on: boolean) => setSelected((s) => (on ? [...new Set([...s, id])] : s.filter((x) => x !== id)));
  const archive = (ids: string[]) => {
    if (!window.confirm(`${t("common.archive")}?`)) return;
    run(() => archiveCandidates(ids), () => {
      setSelected([]);
      router.refresh();
    });
  };
  const tag = () => {
    const value = window.prompt(t("cand.bulk_tag"));
    if (!value) return;
    run(async () => {
      const r = await addTag({ ids: selected, tag: value });
      if (r.ok) toast(t("ui.saved"));
      else toast(Object.values(r.fieldErrors).flat().join(" "), "warn");
    }, () => router.refresh());
  };
  const exportCsv = () => window.location.assign(`/api/candidates/export?${selected.map((id) => `id=${encodeURIComponent(id)}`).join("&")}`);

  return (
    <>
      <div className="bulk-bar" id="bulkBar" hidden={selected.length === 0}>
        <b><span id="selCount">{selected.length}</span> <span>{t("common.selected")}</span></b>
        <Link className="btn btn-sm btn-primary" href={shareHref(selected)}><Icon name="link" /><span>{t("cand.bulk_share")}</span></Link>
        <button className="btn btn-sm" type="button" onClick={tag} disabled={pending}><Icon name="hash" /><span>{t("cand.bulk_tag")}</span></button>
        <button className="btn btn-sm" type="button" onClick={exportCsv} disabled={!isAdmin} title={isAdmin ? undefined : t("role.admin")}><Icon name="download" /><span>{t("common.export")}</span></button>
        <button className="btn btn-sm btn-ghost" type="button" onClick={() => archive(selected)} disabled={pending}><Icon name="archive" /><span>{t("common.archive")}</span></button>
        <div className="grow"></div>
        <button className="btn btn-sm btn-ghost" type="button" onClick={() => setSelected([])}>{t("common.clear_selection")}</button>
      </div>
      <div className="table-wrap">
        <Table className="table">
          <thead>
            <tr>
              <th style={{ width: "36px" }}><input type="checkbox" aria-label="Select all" checked={all} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])} /></th>
              <th>{t("cand.candidate")}</th>
              <th>{t("cand.code")}</th>
              <th>{t("cand.nationality")}</th>
              <th>{t("cand.gender_age")}</th>
              <th>{t("cand.job")}</th>
              <th>JLPT</th>
              <th>{t("cand.video")}</th>
              <th>{t("common.status")}</th>
              <th>{t("common.updated")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td><input type="checkbox" aria-label="Select" checked={selected.includes(c.id)} onChange={(e) => toggle(c.id, e.target.checked)} /></td>
                <td>
                  <Link className="person" href={`/candidates/${c.id}`}>
                    <Photo url={c.photoUrl} initials={c.initials} />
                    <div>
                      <div className="n">{c.name}</div>
                      <div className="k">{c.kana}</div>
                    </div>
                  </Link>
                </td>
                <td className="mono">{c.code}</td>
                <td>{c.nationality && <span className="cc"><span className="flag">{c.flag}</span>{c.nationality}</span>}</td>
                <td>{c.gender}{c.gender && c.age !== null && " · "}{c.age}</td>
                <td>{c.tags.join(" · ")}</td>
                <td>{c.jlpt !== "none" && <span className="badge badge-primary">{c.jlpt}</span>}</td>
                <td className="nums">
                  <span className="row-nowrap"><Icon name="video" className={c.videos ? "ic-sm muted" : "ic-sm"} style={c.videos ? undefined : { color: "var(--warning)" }} />{c.videos}</span>
                </td>
                <td><span className={c.statusClass}>{c.status}</span></td>
                <td className="small muted nowrap">{c.updated}</td>
                <td>
                  <div className="row-actions">
                    <Link className="btn btn-ghost btn-icon btn-sm" href={shareHref([c.id])} title={t("cand.bulk_share")}><Icon name="link" /></Link>
                    <Link className="btn btn-ghost btn-icon btn-sm" href={`/candidates/${c.id}/edit`} title={t("common.edit")}><Icon name="edit" /></Link>
                    <Menu>
                      <summary className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></summary>
                      <div className="menu-list">
                        <Link href={`/candidates/${c.id}`}><Icon name="eye" /><span>{t("common.view")}</span></Link>
                        <a href={`/api/candidates/${c.id}/pdf`} target="_blank" rel="noreferrer"><Icon name="download" /><span>{t("cand.export_pdf")}</span></a>
                        <button type="button" onClick={() => run(() => duplicateCandidate(c.id))}><Icon name="copy" /><span>{t("common.duplicate")}</span></button>
                        <hr />
                        <button type="button" className="danger" onClick={() => archive([c.id])}><Icon name="archive" /><span>{t("common.archive")}</span></button>
                      </div>
                    </Menu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
