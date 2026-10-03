import { formatCandidateCode } from "@rireki/shared";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { requireMember } from "@/lib/tenant";
import { CandidateForm } from "../../CandidateForm";

// app/candidate-form.html — new candidate. The code shown is the tenant's next number; it is assigned for real by the
// first autosave (saveDraft), which also moves the URL to /candidates/{id}/edit.
export default async function CandidateFormPage() {
  const { tenant } = await requireMember();
  const t = await getTranslations();
  return (
    <main className="main" id="main">
      <div className="crumbs">
        <Link href="/candidates">{t("cand.title")}</Link><span>/</span><Link href="/candidates/new">{t("cand.add")}</Link><span>/</span><span>{t("form.title")}</span>
      </div>
      <CandidateForm code={formatCandidateCode(tenant.settings.codePrefix, tenant.settings.nextCode)} status="draft" initial={{ cv: {}, tags: [] }} videos={[]} documents={[]} photoUrl={null} cancelHref="/candidates" />
    </main>
  );
}
