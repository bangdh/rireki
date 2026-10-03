import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/Icon";

/** Crumbs, title and the 3-step progress of app/candidate-import.html, shared by the upload (step 1) and review (step 2) pages. */
export async function ImportHeader({ step }: { step: 1 | 2 }) {
  const t = await getTranslations();
  const cls = (n: number) => `step${n < step ? " done" : n === step ? " active" : ""}`;
  return (
    <>
      <div className="crumbs">
        <Link href="/candidates">{t("cand.title")}</Link><span>/</span><Link href="/candidates/new">{t("cand.add")}</Link><span>/</span><span>{t("cand.import")}</span>
      </div>
      <div className="page-header">
        <div>
          <h1>{t("cand.import")}</h1>
          <p className="sub">{t("import.sub")}</p>
        </div>
      </div>
      <div className="stepper mb-24" aria-label="Progress">
        <div className={cls(1)}><span className="n">{step > 1 ? <Icon name="check" className="ic-sm" /> : 1}</span><span className="t">{t("import.step_upload")}</span></div>
        <div className={cls(2)}><span className="n">2</span><span className="t">{t("import.step_review")}</span></div>
        <div className={cls(3)}><span className="n">3</span><span className="t">{t("import.step_save")}</span></div>
      </div>
    </>
  );
}
