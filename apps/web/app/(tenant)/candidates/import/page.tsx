import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Table } from "@/components/Table";
import { When } from "@/lib/candidates/When";
import { listImportJobs } from "@/lib/extraction/jobs";
import { requireImportSession } from "@/lib/extraction/session";
import { ImportHeader } from "./ImportHeader";

type ImportRow = Awaited<ReturnType<typeof listImportJobs>>[number];

/**
 * Step 1 of app/candidate-import.html: the "Upload a CV file" card of app/candidate-new.html as a plain multipart form posting
 * to ./upload (no client JS), plus the tenant's recent imports. ?error=file comes back from the route for a bad type or size.
 */
export default async function ImportUploadPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, { tenantId }] = await Promise.all([searchParams, requireImportSession()]);
  const [t, jobs] = await Promise.all([getTranslations(), listImportJobs(tenantId)]);

  const status = (job: ImportRow) => {
    switch (job.status) {
      case "saved":
        return <span className="badge badge-success">{t("ui.saved")} {job.code}</span>;
      case "ready":
        return <span className="badge badge-warning">{t("import.needs_review")}</span>;
      case "failed":
        return <span className="badge badge-danger"><Icon name="alert" /></span>;
      default:
        return <span className="badge badge-info">{t("import.step_review")}</span>;
    }
  };
  const action = (job: ImportRow) =>
    job.status === "saved" && job.candidateId ? (
      <Link className="btn btn-sm btn-ghost" href={`/candidates/${job.candidateId}`}>{t("common.open")}</Link>
    ) : job.status === "failed" ? (
      <Link className="btn btn-sm" href="/candidates/import">{t("import.reupload")}</Link>
    ) : (
      <Link className="btn btn-sm" href={`/candidates/import/${job.id}`}>{t("import.review")}</Link>
    );

  return (
    <main className="main" id="main">
      <ImportHeader step={1} />
      <form className="card" method="post" encType="multipart/form-data" action="/candidates/import/upload">
        <div className="card-body stack">
          <label className="dropzone" htmlFor="file">
            <Icon name="upload" className="ic-xl" />
            <b>{t("candnew.upload_t")}</b>
            <span className="small muted">{t("candnew.upload_d")}</span>
            <input id="file" name="file" type="file" accept=".pdf,.docx,.jpg,.jpeg,.png,.heic" required className="small" style={{ marginTop: "8px" }} />
            <span className="small faint">DOCX · PDF · JPG/PNG (scan) · <span>{t("candnew.max")}</span></span>
          </label>
          {error === "file" && <span className="error-text" role="alert">{t("candnew.max")} · DOCX · PDF · JPG/PNG</span>}
        </div>
        <div className="card-footer">
          <Link className="btn" href="/candidates/new">{t("common.cancel")}</Link>
          <button className="btn btn-primary" type="submit"><Icon name="upload" /><span>{t("common.upload")}</span></button>
        </div>
      </form>

      <section className="card mt-24">
        <div className="card-header"><h3>{t("candnew.recent")}</h3></div>
        {jobs.length === 0 ? (
          <div className="empty"><Icon name="sparkles" /><span>{t("common.none")}</span></div>
        ) : (
          <div className="table-wrap">
            <Table className="table">
              <thead>
                <tr><th>{t("common.file")}</th><th>{t("common.uploaded_by")}</th><th>{t("common.status")}</th><th>{t("common.time")}</th><th></th></tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="row-nowrap"><Icon name="file" className="muted" /><span>{job.fileName}</span></td>
                    <td>{job.uploadedBy}</td>
                    <td>{status(job)}</td>
                    <td className="small muted"><When date={job.createdAt} /></td>
                    <td className="right">{action(job)}</td>
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
