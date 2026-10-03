import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { fmtBytes } from "@/lib/candidates/format";
import { When } from "@/lib/candidates/When";
import { lowFields } from "@/lib/extraction/form";
import { Confidence, Extracted, getImportJob, objectSize, presignGet, uploaderName } from "@/lib/extraction/jobs";
import { requireImportSession } from "@/lib/extraction/session";
import { ImportHeader } from "../ImportHeader";
import { Poll } from "./Poll";
import { ReviewForm } from "./ReviewForm";

const kindOf = (fileName: string) => (/\.pdf$/i.test(fileName) ? "pdf" : /\.(jpe?g|png|heic)$/i.test(fileName) ? "image" : "docx");

/** The mockup's grey page thumbnail, kept for DOCX (nothing renders its pages yet). TODO(phase2): page images from the extractor. */
function DocPlaceholder() {
  return (
    <div className="doc-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ flex: "1" }}>
          <div className="l m" style={{ height: "9px", width: "30%", background: "#333" }}></div><div className="l s"></div><div className="l"></div><div className="l m"></div><div className="l s"></div>
        </div>
        <div style={{ width: "44px", height: "56px", background: "#DDD", border: "1px solid #BBB" }}></div>
      </div>
      <div style={{ marginTop: "8px", borderTop: "1px solid #ccc", paddingTop: "6px" }}>
        <div className="l m" style={{ background: "#333", height: "7px", width: "20%" }}></div><div className="l"></div><div className="l m"></div><div className="l"></div><div className="l m"></div><div className="l"></div><div className="l m"></div>
      </div>
      <div style={{ marginTop: "8px", borderTop: "1px solid #ccc", paddingTop: "6px" }}>
        <div className="l m" style={{ background: "#333", height: "7px", width: "30%" }}></div><div className="l"></div><div className="l"></div><div className="l s"></div><div className="l"></div><div className="l"></div><div className="l s"></div>
      </div>
    </div>
  );
}

/**
 * app/candidate-import.html — step 2: the ImportJob of this tenant in its three states. queued/processing polls until the
 * worker is done, failed offers a re-upload, ready shows the original (presigned), the file details with the cropped photo and
 * the review form; saved jobs go to their candidate.
 */
export default async function ImportReviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const [{ jobId }, session] = await Promise.all([params, requireImportSession()]);
  const job = await getImportJob(session.tenantId, jobId);
  if (!job) notFound();
  if (job.status === "saved" && job.candidateId) redirect(`/candidates/${job.candidateId}`);
  const t = await getTranslations();
  const extracted = job.status === "ready" ? Extracted.safeParse(job.extracted) : null;

  if (job.status === "failed" || (extracted && !extracted.success)) {
    return (
      <main className="main" id="main">
        <ImportHeader step={2} />
        <div className="callout callout-danger mb-16" role="alert">
          <Icon name="alert" />
          <div className="stack" style={{ gap: "8px" }}>
            <b>{job.fileName}</b>
            <Link className="btn btn-sm" href="/candidates/import" style={{ alignSelf: "flex-start" }}>{t("import.reupload")}</Link>
          </div>
        </div>
      </main>
    );
  }

  if (!extracted?.success) {
    return (
      <main className="main" id="main">
        <ImportHeader step={2} />
        <div className="callout mb-16" aria-busy="true" aria-live="polite">
          <Icon name="sparkles" />
          <div className="grow">
            <b>{job.fileName}</b>
            <div className="progress mt-8" style={{ maxWidth: "360px" }}><i style={{ width: "40%", animation: "rireki-indeterminate 1.4s ease-in-out infinite" }} /></div>
          </div>
        </div>
        {/* the mockup has no in-progress state; globals.css is shared, so the one keyframe lives here */}
        <style>{"@keyframes rireki-indeterminate{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}"}</style>
        <Poll />
      </main>
    );
  }

  const { cv, pages } = extracted.data;
  const confidence = Confidence.safeParse(job.confidence).data ?? {};
  const lowCount = lowFields(confidence).length;
  const kind = kindOf(job.fileName);
  const [docUrl, photoUrl, size, uploadedBy] = await Promise.all([
    presignGet(job.fileKey),
    job.photoKey ? presignGet(job.photoKey) : null,
    objectSize(job.fileKey),
    uploaderName(job.createdById),
  ]);

  return (
    <main className="main" id="main">
      <ImportHeader step={2} />
      <div className="callout callout-success mb-16">
        <Icon name="sparkles" />
        <div className="row" style={{ flexWrap: "wrap" }}>
          <span><b>{job.fileName}</b> · {pages} <span>{t("import.pages")}</span></span>
          {lowCount > 0 && <span className="badge badge-warning">{lowCount} <span>{t("import.to_check")}</span></span>}
        </div>
      </div>
      <div className="grid grid-aside-main grid-doc">
        <div className="stack">
          <div className="doc-preview">
            <div className="row between">
              <span className="strong small">{t("import.original")}</span>
              <span className="small nums">{pages} <span>{t("import.pages")}</span></span>
            </div>
            {kind === "pdf" ? (
              <iframe className="doc-page" src={docUrl} title={job.fileName} style={{ width: "100%", padding: 0 }} />
            ) : kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived presigned S3 URL
              <img className="doc-page" src={docUrl} alt={job.fileName} style={{ width: "100%", height: "auto", padding: 0, objectFit: "contain" }} />
            ) : (
              <DocPlaceholder />
            )}
          </div>
          <div className="card">
            <div className="card-body stack" style={{ gap: "10px" }}>
              <div className="row between"><span className="strong small">{t("import.file_info")}</span></div>
              <dl className="kv small">
                <dt>{t("common.file")}</dt><dd className="mono">{job.fileName} · {fmtBytes(size)}</dd>
                <dt>{t("common.uploaded_by")}</dt><dd>{uploadedBy} · <When date={job.createdAt} time /></dd>
                <dt>{t("import.keep_original")}</dt><dd><span>{t("import.keep_original_d")}</span></dd>
                {photoUrl && (
                  <>
                    <dt>{t("form.photo")}</dt>
                    {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned S3 URL */}
                    <dd><img src={photoUrl} alt="" style={{ width: "90px", height: "120px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--border)" }} /></dd>
                  </>
                )}
              </dl>
              <Link className="btn btn-sm" href="/candidates/import" style={{ alignSelf: "flex-start" }}>{t("import.reupload")}</Link>
            </div>
          </div>
        </div>
        <ReviewForm jobId={job.id} cv={cv} confidence={confidence} codePrefix={session.codePrefix} nextCode={session.nextCode} />
      </div>
    </main>
  );
}
