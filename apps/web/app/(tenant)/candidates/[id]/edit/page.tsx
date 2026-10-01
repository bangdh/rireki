import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { byCode } from "@/lib/sample";
import { CandidateForm } from "../../CandidateForm";

// Edit = the same 7-step form pre-filled. TODO(candidates): load the candidate (tenantId + id) and pass its cv body.
export default async function CandidateEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const c = byCode(id);
  return (
    <main className="main" id="main">
      <div className="crumbs">
        <Link href="/candidates">{t("cand.title")}</Link><span>/</span><Link href={`/candidates/${c.id}`}>{c.name}</Link><span>/</span><span>{t("common.edit")}</span>
      </div>
      <div className="page-header">
        <div>
          <h1>{c.name}</h1>
          <p className="sub">
            <span className="mono">{c.code}</span> · <span className="badge">{t(`status.${c.status}`)}</span> <span className="faint">{t("form.autosaved")}</span>
          </p>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" type="button">{t("import.save_draft")}</button>
          <Link className="btn" href={`/candidates/${c.id}`}>{t("common.cancel")}</Link>
        </div>
      </div>
      <CandidateForm prefix={c.code.slice(0, 2)} number={c.code.slice(2)} />
    </main>
  );
}
