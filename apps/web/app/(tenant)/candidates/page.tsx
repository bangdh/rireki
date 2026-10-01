import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Menu } from "@/components/Menu";
import { Table } from "@/components/Table";
import { CANDIDATES } from "@/lib/sample";
import { FLAGS, STATUS_BADGE } from "@/lib/ui";

// app/candidates.html. TODO(candidates): rows from Prisma filtered by searchParams (q, nationality, job, jlpt, status, video),
// pagination, selection state + bulk bar as a client component, table/cards toggle.
export default async function CandidatesPage() {
  const t = await getTranslations();
  const rows = CANDIDATES.slice(0, 8);
  const selected: number = 3; // sample: the first three rows are checked, which shows the bulk bar
  return (
    <main className="main" id="main">
      <div className="page-header">
        <div>
          <h1>{t("cand.title")}</h1>
          <p className="sub">182 <span>{t("common.candidates_lc")}</span> · 141 <span>{t("cand.with_video")}</span> · 12 <span>{t("cand.updated_week")}</span></p>
        </div>
        <div className="actions">
          <Link className="btn" href="/candidates/import/demo"><Icon name="upload" /><span>{t("cand.import")}</span></Link>
          <Link className="btn btn-primary" href="/candidates/new"><Icon name="plus" /><span>{t("cand.add")}</span></Link>
        </div>
      </div>
      <section className="card">
        <div className="table-toolbar">
          <div className="search input-wrap"><Icon name="search" /><input className="input input-sm" name="q" placeholder={t("cand.search_ph")} /></div>
          <select className="select select-sm" style={{ width: "auto" }} name="nationality" aria-label={t("cand.nationality")}>
            <option value="">{t("cand.nationality")}</option><option value="VN">🇻🇳 Vietnam</option><option value="MM">🇲🇲 Myanmar</option><option value="BD">🇧🇩 Bangladesh</option><option value="ID">🇮🇩 Indonesia</option>
          </select>
          <select className="select select-sm" style={{ width: "auto" }} name="job" aria-label={t("cand.job")}>
            <option value="">{t("cand.job")}</option><option>溶接</option><option>介護</option><option>建設</option><option>食品加工</option><option>農業</option><option>機械加工</option>
          </select>
          <select className="select select-sm" style={{ width: "auto" }} name="jlpt" aria-label="JLPT">
            <option value="">JLPT</option><option>N2</option><option>N3</option><option>N4</option><option>N5</option>
          </select>
          <select className="select select-sm" style={{ width: "auto" }} name="status" aria-label={t("common.status")}>
            <option value="">{t("common.status")}</option>
            {(["available", "proposed", "interviewing", "selected", "departed"] as const).map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </select>
          <button className="filter-chip active" type="button"><Icon name="video" className="ic-sm" /><span>{t("cand.has_video")}</span></button>
          <button className="btn btn-sm btn-ghost" type="button"><Icon name="filter" /><span>{t("common.more_filters")}</span></button>
          <div className="grow"></div>
          <div className="segmented" role="group" aria-label="View"><button className="active" type="button">{t("common.table")}</button><button type="button">{t("common.cards")}</button></div>
        </div>
        <div className="bulk-bar" id="bulkBar" hidden={selected === 0}>
          <b><span id="selCount">{selected}</span> <span>{t("common.selected")}</span></b>
          <Link className="btn btn-sm btn-primary" href="/shares/new"><Icon name="link" /><span>{t("cand.bulk_share")}</span></Link>
          <button className="btn btn-sm" type="button"><Icon name="hash" /><span>{t("cand.bulk_tag")}</span></button>
          <button className="btn btn-sm" type="button"><Icon name="download" /><span>{t("common.export")}</span></button>
          <button className="btn btn-sm btn-ghost" type="button"><Icon name="archive" /><span>{t("common.archive")}</span></button>
          <div className="grow"></div>
          <button className="btn btn-sm btn-ghost" type="button">{t("common.clear_selection")}</button>
        </div>
        <div className="table-wrap">
          <Table className="table">
            <thead>
              <tr>
                <th style={{ width: "36px" }}><input type="checkbox" aria-label="Select all" /></th>
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
              {rows.map((c, i) => (
                <tr key={c.id}>
                  <td><input type="checkbox" aria-label="Select" defaultChecked={i < selected} /></td>
                  <td>
                    <Link className="person" href={`/candidates/${c.id}`}>
                      <span className="avatar-photo">{c.initials}</span>
                      <div>
                        <div className="n">{c.name}</div>
                        <div className="k">{c.kana}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="mono">{c.code}</td>
                  <td><span className="cc"><span className="flag">{FLAGS[c.nationality]}</span>{c.nationality}</span></td>
                  <td><span>{t(`gender.${c.gender}`)}</span> · {c.age}</td>
                  <td>{c.job}</td>
                  <td><span className="badge badge-primary">{c.jlpt}</span></td>
                  <td className="nums">
                    <span className="row-nowrap"><Icon name="video" className={c.videos ? "ic-sm muted" : "ic-sm"} style={c.videos ? undefined : { color: "var(--warning)" }} />{c.videos}</span>
                  </td>
                  <td><span className={STATUS_BADGE[c.status]}>{t(`status.${c.status}`)}</span></td>
                  <td className="small muted nowrap">{c.updated}</td>
                  <td>
                    <div className="row-actions">
                      <Link className="btn btn-ghost btn-icon btn-sm" href={`/shares/new?candidate=${c.id}`} title="Share"><Icon name="link" /></Link>
                      <Link className="btn btn-ghost btn-icon btn-sm" href={`/candidates/${c.id}/edit`} title="Edit"><Icon name="edit" /></Link>
                      <Menu>
                        <summary className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></summary>
                        <div className="menu-list">
                          <Link href={`/candidates/${c.id}`}><Icon name="eye" /><span>{t("common.view")}</span></Link>
                          <a href="#"><Icon name="download" /><span>{t("cand.export_pdf")}</span></a>
                          <a href="#"><Icon name="copy" /><span>{t("common.duplicate")}</span></a>
                          <hr />
                          <a href="#" className="danger"><Icon name="archive" /><span>{t("common.archive")}</span></a>
                        </div>
                      </Menu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <div className="pagination">
          <span><span>{t("common.showing")}</span> 1–{rows.length} <span>{t("common.of")}</span> 182</span>
          <div className="pages">
            <button type="button" aria-label="Previous"><Icon name="chev-left" className="ic-sm" /></button><button type="button" className="active">1</button><button type="button">2</button><button type="button">3</button><span style={{ padding: "0 4px" }}>…</span><button type="button">23</button><button type="button" aria-label="Next"><Icon name="chev-right" className="ic-sm" /></button>
          </div>
          <span className="row-nowrap">
            <span>{t("common.per_page")}</span><select className="select select-sm" style={{ width: "auto" }} aria-label={t("common.per_page")}><option>8</option><option>25</option><option>50</option></select>
          </span>
        </div>
      </section>
    </main>
  );
}
