"use client";

import { FEEDBACK_VERDICTS } from "@rireki/shared";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toast";
import { sendFeedback, type FeedbackState } from "../../actions";

/** viewer/detail.html feedback card: verdict chips + comment → sendFeedback (one row per viewer and candidate); `tenant` names the sender on the button. */
export function FeedbackForm({ token, candidateId, current, comment, tenant }: { token: string; candidateId: string; current: string | null; comment: string | null; tenant: string }) {
  const t = useTranslations();
  const [verdict, setVerdict] = useState(current ?? "interested");
  const [state, action, pending] = useActionState<FeedbackState, FormData>(sendFeedback.bind(null, token), null);
  useEffect(() => {
    if (state?.ok) toast(t("ui.sent"));
  }, [state, t]);
  return (
    <section className="card">
      <div className="card-header"><h3>{t("viewer.feedback")}</h3></div>
      <form className="card-body stack" action={action}>
        <input type="hidden" name="candidateId" value={candidateId} />
        <input type="hidden" name="verdict" value={verdict} />
        <div className="row" style={{ gap: "6px" }}>
          {FEEDBACK_VERDICTS.map((v) => (
            <button key={v} className={verdict === v ? "filter-chip active" : "filter-chip"} type="button" onClick={() => setVerdict(v)}>
              {v === "interested" && <Icon name="star" className="ic-sm" style={{ color: "var(--warning)" }} />}
              <span>{t(`viewer.${v}`)}</span>
            </button>
          ))}
        </div>
        <textarea className="textarea" name="comment" style={{ minHeight: "70px" }} defaultValue={comment ?? ""} aria-label={t("viewer.feedback")} maxLength={1000} />
        <button className="btn btn-primary" type="submit" disabled={pending}>{t("viewer.send_feedback", { tenant })}</button>
        {state && !state.ok && <span className="error-text">{t("track.a_failed")}</span>}
        <p className="hint">{t("viewer.feedback_hint")}</p>
      </form>
    </section>
  );
}
