import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { listImportJobs } from "./jobs";

// The status and action cells of a "Recent imports" row, shared by /candidates/import and /candidates/new (server components).
type ImportRow = Awaited<ReturnType<typeof listImportJobs>>[number];

/** saved → "Saved as {code}" · ready → needs review · failed · queued/processing → processing. */
export async function ImportStatus({ job }: { job: ImportRow }) {
  const t = await getTranslations();
  switch (job.status) {
    case "saved":
      // The mockup's sample code is baked into import.saved in all five languages. TODO(integration): "Saved as {code}" in assets/i18n.js.
      return <span className="badge badge-success">{t("import.saved").replace("SV000215", job.code ?? "—")}</span>;
    case "ready":
      return <span className="badge badge-warning">{t("import.needs_review")}</span>;
    case "failed":
      return <span className="badge badge-danger"><Icon name="alert" /><span>{t("common.failed")}</span></span>;
    default:
      return <span className="badge badge-info">{t("common.processing")}</span>;
  }
}

/** Open the saved candidate, upload a different file after a failure, otherwise review (the review page polls while queued). */
export async function ImportAction({ job }: { job: ImportRow }) {
  const t = await getTranslations();
  return job.status === "saved" && job.candidateId ? (
    <Link className="btn btn-sm btn-ghost" href={`/candidates/${job.candidateId}`}>{t("common.open")}</Link>
  ) : job.status === "failed" ? (
    <Link className="btn btn-sm" href="/candidates/import">{t("import.reupload")}</Link>
  ) : (
    <Link className="btn btn-sm" href={`/candidates/import/${job.id}`}>{t("import.review")}</Link>
  );
}
