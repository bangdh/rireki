// The one zod error map of the app's forms (share links, candidates, CV import): zod's bundled messages are developer
// wording and ship no Burmese, so every issue becomes a form.err_* string in the UI language. Pure: the caller passes
// next-intl's translator, `schema.safeParse(data, { error: errorMap(await getTranslations()) })`.
import type { getTranslations } from "next-intl/server";
import type { z } from "zod";

type Translator = Awaited<ReturnType<typeof getTranslations<never>>>; // the root translator (keys like "form.err_required")

export const errorMap =
  (t: Translator): z.core.$ZodErrorMap =>
  (issue) => {
    if (issue.input === undefined) return t("form.err_required"); // a missing field, or a blank one the action made undefined
    switch (issue.code) {
      case "too_small":
        if (issue.origin === "string" && Number(issue.minimum) > 1) return t("form.err_min", { min: Number(issue.minimum) });
        return t(issue.origin === "string" || issue.origin === "array" ? "form.err_required" : "form.err_invalid");
      case "too_big":
        return issue.origin === "string" ? t("form.err_max", { max: Number(issue.maximum) }) : t("form.err_invalid");
      case "invalid_format":
        return t(issue.format === "email" ? "form.err_email" : issue.format === "domain" ? "form.err_domain" : "form.err_invalid");
      default:
        return t("form.err_invalid");
    }
  };
