import { formatCandidateCode } from "@rireki/shared";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Table } from "@/components/Table";
import { When } from "@/lib/candidates/When";
import { ImportAction, ImportStatus } from "@/lib/extraction/ImportCells";
import { listImportJobs } from "@/lib/extraction/jobs";
import { requireMember } from "@/lib/tenant";

// app/candidate-new.html — choose how to add a candidate; the import routes belong to the import lane (/candidates/import).
export default async function CandidateNewPage() {
  const { tenant } = await requireMember();
  const [t, jobs] = await Promise.all([getTranslations(), listImportJobs(tenant.id)]);
  const imports = jobs.slice(0, 3); // same rows, badges and actions as the import lane's list
  const nextCode = formatCandidateCode(tenant.settings.codePrefix, tenant.settings.nextCode);
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
        <Link className="option-card" href="/candidates/import">
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
        {/* TODO(phase2): bulk import (ZIP / XLSX / CSV) */}
        <a className="option-card" href="#" aria-disabled="true" style={{ opacity: 0.6, pointerEvents: "none" }}>
          <span className="badge recommended">{t("common.beta")}</span>
          <div className="icon-box"><Icon name="layers" className="ic-lg" /></div>
          <h3>{t("candnew.bulk_t")}</h3>
          <p className="muted">{t("candnew.bulk_d")}</p>
          <span className="small faint">ZIP · XLSX · CSV</span>
        </a>
      </div>
      <div className="callout mt-24">
        <Icon name="info" />
        <div><b>{t("candnew.code_t")}</b><br /><span>{t("candnew.code_d")}</span> <code>{nextCode}</code>. <span>{t("candnew.code_d2")}</span></div>
      </div>
      <section className="card mt-24">
        <div className="card-header">
          <h3>{t("candnew.recent")}</h3>
          <Link className="btn btn-sm btn-ghost" href="/candidates/import">{t("common.view_all")}</Link>
        </div>
        {imports.length === 0 ? (
          <div className="empty"><Icon name="sparkles" /><span>{t("common.none")}</span></div>
        ) : (
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
                {imports.map((job) => (
                  <tr key={job.id}>
                    <td className="row-nowrap"><Icon name="file" className="muted" /><span>{job.fileName}</span></td>
                    <td>{job.uploadedBy}</td>
                    <td><ImportStatus job={job} /></td>
                    <td className="small muted"><When date={job.createdAt} /></td>
                    <td className="right"><ImportAction job={job} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </section>
    </main>
  );
}
