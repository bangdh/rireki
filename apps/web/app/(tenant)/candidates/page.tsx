import { CANDIDATE_STATUSES, JLPT_LEVELS, NATIONALITIES } from "@rireki/shared";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ageAt } from "@/components/rirekisho/Rirekisho";
import { BUCKET, urlOf } from "@/lib/candidates/files";
import { countryName, initials, pageWindow, statusKey } from "@/lib/candidates/format";
import { candidateCounts, listCandidates, listTags } from "@/lib/candidates/queries";
import { parseListQuery, type SearchParams } from "@/lib/candidates/schemas";
import { requireMember } from "@/lib/tenant";
import { FLAGS, STATUS_BADGE } from "@/lib/ui";
import { AutoSubmit } from "./AutoSubmit";
import { CandidateTable, Photo, type Row } from "./CandidateTable";

// app/candidates.html — filters are a plain GET form (selects auto-submit; chip, view toggle and page numbers are
// submit buttons whose value wins over the hidden input of the same name), the table is a client component.
export default async function CandidatesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const q = parseListQuery(await searchParams);
  const { tenant, role } = await requireMember();
  const [t, f, locale, { rows, total }, counts, tags] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getLocale(),
    listCandidates(tenant.id, q),
    candidateCounts(tenant.id),
    listTags(tenant.id),
  ]);
  const now = new Date();
  const list: Row[] = await Promise.all(
    rows.map(async (c) => ({
      id: c.id,
      code: c.code,
      name: c.nameNative || c.nameLatin,
      kana: c.nameKana,
      initials: initials(c.nameLatin),
      photoUrl: await urlOf(BUCKET.originals, c.photoKey),
      nationality: c.nationality,
      flag: c.nationality && c.nationality in FLAGS ? FLAGS[c.nationality as keyof typeof FLAGS] : "",
      country: c.nationality ? countryName(locale, c.nationality) : "",
      gender: c.gender === "male" ? t("gender.m") : c.gender === "female" ? t("gender.f") : "",
      age: c.dob ? ageAt(c.dob.toISOString().slice(0, 10), now) : null,
      tags: c.tags,
      jlpt: c.jlpt,
      videos: c._count.videos,
      status: t(statusKey(c.status)),
      statusClass: c.status in STATUS_BADGE ? STATUS_BADGE[c.status as keyof typeof STATUS_BADGE] : "badge",
      updated: f.dateTime(c.updatedAt, { dateStyle: "medium" }),
    })),
  );
  const last = Math.max(1, Math.ceil(total / q.per));
  const from = total === 0 ? 0 : (q.page - 1) * q.per + 1;
  const to = Math.min(total, q.page * q.per);
  const selectStyle = { width: "auto" } as const;

  return (
    <main className="main" id="main">
      <div className="page-header">
        <div>
          <h1>{t("cand.title")}</h1>
          <p className="sub">{counts.total} <span>{t("common.candidates_lc")}</span> · {counts.withVideo} <span>{t("cand.with_video")}</span> · {counts.updatedWeek} <span>{t("cand.updated_week")}</span></p>
        </div>
        <div className="actions">
          <Link className="btn" href="/candidates/import"><Icon name="upload" /><span>{t("cand.import")}</span></Link>
          <Link className="btn btn-primary" href="/candidates/new"><Icon name="plus" /><span>{t("cand.add")}</span></Link>
        </div>
      </div>
      <section className="card">
        <form method="get" action="/candidates">
          {/* the current view and chip travel with every submit; the default submit button keeps Enter in the search box from toggling the chip */}
          <input type="hidden" name="view" value={q.view} />
          <input type="hidden" name="video" value={q.video ?? ""} />
          <button type="submit" hidden tabIndex={-1} aria-hidden="true" />
          <div className="table-toolbar">
            <div className="search input-wrap"><Icon name="search" /><input className="input input-sm" name="q" defaultValue={q.q} placeholder={t("cand.search_ph")} /></div>
            <select className="select select-sm" style={selectStyle} name="nationality" defaultValue={q.nationality ?? ""} aria-label={t("cand.nationality")}>
              <option value="">{t("cand.nationality")}</option>
              {NATIONALITIES.map((n) => <option key={n} value={n}>{FLAGS[n]} {countryName(locale, n)}</option>)}
            </select>
            <select className="select select-sm" style={selectStyle} name="job" defaultValue={q.job ?? ""} aria-label={t("cand.job")}>
              <option value="">{t("cand.job")}</option>
              {tags.map((tag) => <option key={tag}>{tag}</option>)}
            </select>
            <select className="select select-sm" style={selectStyle} name="jlpt" defaultValue={q.jlpt ?? ""} aria-label="JLPT">
              <option value="">JLPT</option>
              {JLPT_LEVELS.map((l) => <option key={l} value={l}>{l === "none" ? t("common.none") : l}</option>)}
            </select>
            <select className="select select-sm" style={selectStyle} name="status" defaultValue={q.status ?? ""} aria-label={t("common.status")}>
              <option value="">{t("common.status")}</option>
              {CANDIDATE_STATUSES.map((s) => <option key={s} value={s}>{t(statusKey(s))}</option>)}
            </select>
            <button className={q.video === "1" ? "filter-chip active" : "filter-chip"} type="submit" name="video" value={q.video === "1" ? "" : "1"}><Icon name="video" className="ic-sm" /><span>{t("cand.has_video")}</span></button>
            {/* TODO(phase2): more filters */}
            <button className="btn btn-sm btn-ghost" type="button" disabled><Icon name="filter" /><span>{t("common.more_filters")}</span></button>
            <div className="grow"></div>
            <div className="segmented" role="group" aria-label="View">
              <button className={q.view === "table" ? "active" : undefined} type="submit" name="view" value="table">{t("common.table")}</button>
              <button className={q.view === "cards" ? "active" : undefined} type="submit" name="view" value="cards">{t("common.cards")}</button>
            </div>
          </div>
          {q.view === "table" ? (
            <CandidateTable rows={list} isAdmin={role === "admin"} />
          ) : (
            <div className="cand-grid" style={{ padding: "14px" }}>
              {list.map((c) => (
                <Link key={c.id} className="cand-card" href={`/candidates/${c.id}`}>
                  <Photo url={c.photoUrl} initials={c.initials} className="avatar-photo lg" />
                  <div className="grow">
                    <div className="row between"><div className="n">{c.kana || c.name}</div><span className={c.statusClass}>{c.status}</span></div>
                    <div className="k">{c.name} · {c.code}</div>
                    <div className="facts">
                      <span>{[c.gender, c.age, c.nationality && `${c.flag} ${c.country}`].filter((x) => x !== null && x !== "").join(" · ")}</span>
                      <span>{[...c.tags, c.jlpt !== "none" && `JLPT ${c.jlpt}`].filter(Boolean).join(" · ")}</span>
                      <span className="row-nowrap"><Icon name="video" className="ic-sm" style={c.videos ? undefined : { color: "var(--warning)" }} />{c.videos} <span>{t("cand.video")}</span></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {total === 0 && (
            <div className="empty"><Icon name="search" /><span>{t("common.none")}</span></div>
          )}
          <div className="pagination">
            <span><span>{t("common.showing")}</span> {from}–{to} <span>{t("common.of")}</span> {total}</span>
            <div className="pages">
              <button type="submit" name="page" value={q.page - 1} disabled={q.page <= 1} aria-label="Previous"><Icon name="chev-left" className="ic-sm" /></button>
              {pageWindow(q.page, last).map((p, i) =>
                p === null ? <span key={`gap${i}`} style={{ padding: "0 4px" }}>…</span> : <button key={p} type="submit" name="page" value={p} className={p === q.page ? "active" : undefined}>{p}</button>,
              )}
              <button type="submit" name="page" value={q.page + 1} disabled={q.page >= last} aria-label="Next"><Icon name="chev-right" className="ic-sm" /></button>
            </div>
            <span className="row-nowrap">
              <span>{t("common.per_page")}</span>
              <select className="select select-sm" style={selectStyle} name="per" defaultValue={q.per} aria-label={t("common.per_page")}>
                {[8, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </span>
          </div>
          <AutoSubmit />
        </form>
      </section>
    </main>
  );
}
