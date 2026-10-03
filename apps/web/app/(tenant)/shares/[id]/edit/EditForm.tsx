"use client";

import type { LinkDefaults } from "@rireki/shared";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import type { LinkFormValues } from "@/lib/shares/form";
import { updateShareLink, type LinkFormState } from "../../actions";
import { LinkSettingsFields } from "../../new/LinkSettingsFields";

/** Step 2 of the wizard around updateShareLink; the action redirects to the tracking page on success. */
export function EditForm({ id, initial, defaults, clients, candidateCount }: { id: string; initial: LinkFormValues; defaults: LinkDefaults; clients: string[]; candidateCount: number }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<LinkFormState, FormData>(updateShareLink.bind(null, id), null);
  return (
    <form action={action}>
      <LinkSettingsFields
        initial={initial}
        defaults={defaults}
        errors={state && !state.ok ? state.fieldErrors : undefined}
        clients={clients}
        candidateCount={candidateCount}
        mode="edit"
        footer={
          <>
            <Link className="btn" href={`/shares/${id}`}>{t("common.cancel")}</Link>
            <button className="btn btn-primary" type="submit" disabled={pending}>{t("common.save")}</button>
          </>
        }
      />
    </form>
  );
}
