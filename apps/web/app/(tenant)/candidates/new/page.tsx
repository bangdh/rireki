import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Table } from "@/components/Table";
import { TENANT } from "@/lib/sample";

// app/candidate-new.html — choose how to add a candidate. TODO(import): "Upload a CV file" opens the upload step; recent imports from ImportJob.
const RECENT_IMPORTS = [
  { file: "CV_Su_Su_Hlaing.pdf", by: "Aung Myat", status: "needs_review", when: "09:31", day: "today", href: "/candidates/import/demo" },
  { file: "Rahim_Uddin_CV_2026.docx", by: "Lê Văn Tùng", status: "needs_review", when: "17:50", day: "yesterday", href: "/candidates/import/demo" },
  { file: "SoYeuLyLich_PhamMinhDuc.pdf", by: "Lê Văn Tùng", status: "saved", when: "17:42", day: "yesterday", href: "/candidates/SV000215" },
] as const;

export default async function CandidateNewPage() {
  const t = await getTranslations();
  return (
    <main className="main" id="main">
      <div className="crumbs"><Link href="/candidates">{t("cand.title")}</Link><span>/</span><span>{t("cand.add")}</span></div>
      <div className="page-header">
        <div>
          <h1>{t("cand.add")}</h1>
          <p className="sub">{t("candnew.sub")}</p>
        </div>
      </div>
      <div className="grid grid-3">
        <Link className="option-card" href="/candidates/import/demo">
          <span className="badge badge-primary recommended">{t("common.recommended")}</span>
          <div className="icon-box"><Icon name="upload" className="ic-lg" /></div>
          <h3>{t("candnew.upload_t")}</h3>
          <p className="muted">{t("candnew.upload_d")}</p>
          <span className="small faint">DOCX · PDF · JPG/PNG (scan) · <span>{t("candnew.max")}</span></span>
        </Link>
        <Link className="option-card" href="/candidates/new/form">
          <div className="icon-box"><Icon name="form" className="ic-lg" /></div>
          <h3>{t("candnew.form_t")}</h3>
          <p className="muted">{t("candnew.form_d")}</p>
          <span className="small faint">{t("candnew.form_time")}</span>
        </Link>
        <a className="option-card" href="#">
          <span className="badge recommended">{t("common.beta")}</span>
          <div className="icon-box"><Icon name="layers" className="ic-lg" /></div>
          <h3>{t("candnew.bulk_t")}</h3>
          <p className="muted">{t("candnew.bulk_d")}</p>
          <span className="small faint">ZIP · XLSX · CSV</span>
        </a>
      </div>
      <div className="callout mt-24">
        <Icon name="info" />
        <div><b>{t("candnew.code_t")}</b><br /><span>{t("candnew.code_d")}</span> <code>{TENANT.nextCode}</code>. <span>{t("candnew.code_d2")}</span></div>
      </div>
      <section className="card mt-24">
        <div className="card-header">
          <h3>{t("candnew.recent")}</h3>
          <Link className="btn btn-sm btn-ghost" href="/candidates/import/demo">{t("common.view_all")}</Link>
        </div>
        <div className="table-wrap">
          <Table className="table">
            <thead>
              <tr>
                <th>{t("common.file")}</th>
                <th>{t("common.uploaded_by")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.time")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {RECENT_IMPORTS.map((r) => (
                <tr key={r.file}>
                  <td className="row-nowrap"><Icon name="file" className="muted" /><span>{r.file}</span></td>
                  <td>{r.by}</td>
                  <td>
                    {r.status === "saved" ? <span className="badge badge-success">{t("import.saved")}</span> : <span className="badge badge-warning">{t("import.needs_review")}</span>}
                  </td>
                  <td className="small muted">{r.when} <span>{t(`common.${r.day}`)}</span></td>
                  <td className="right">
                    <Link className={r.status === "saved" ? "btn btn-sm btn-ghost" : "btn btn-sm"} href={r.href}>{t(r.status === "saved" ? "common.open" : "import.review")}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </section>
    </main>
  );
}
