import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { TENANT } from "@/lib/sample";
import { CandidateForm } from "../../CandidateForm";

// app/candidate-form.html — new candidate via the 7-step form. TODO(candidates): next code from TenantSettings, draft autosave status.
export default async function CandidateFormPage() {
  const t = await getTranslations();
  const prefix = TENANT.nextCode.slice(0, 2), number = TENANT.nextCode.slice(2);
  return (
    <main className="main" id="main">
      <div className="crumbs">
        <Link href="/candidates">{t("cand.title")}</Link><span>/</span><Link href="/candidates/new">{t("cand.add")}</Link><span>/</span><span>{t("form.title")}</span>
      </div>
      <div className="page-header">
        <div>
          <h1>{t("form.title")}</h1>
          <p className="sub">
            <span className="mono">{TENANT.nextCode}</span> · <span className="badge">{t("status.draft")}</span> <span className="faint">{t("form.autosaved")}</span>
          </p>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" type="button">{t("import.save_draft")}</button>
          <Link className="btn" href="/candidates">{t("common.cancel")}</Link>
        </div>
      </div>
      <CandidateForm prefix={prefix} number={number} />
    </main>
  );
}
