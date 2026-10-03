"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { authClient } from "@/lib/auth-client";

export function ForgotForm() {
  const t = useTranslations();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    await authClient.requestPasswordReset(
      { email: String(new FormData(e.currentTarget).get("email")), redirectTo: "/login/reset" },
      { onSuccess: () => setSent(true), onError: () => { setError(t("auth.err_invalid")); setPending(false); } },
    );
  }

  return (
    <form className="auth-card" method="post" onSubmit={onSubmit}>
      <div>
        <h1>{t("auth.forgot_title")}</h1>
      </div>
      {sent ? (
        <div className="callout callout-success"><Icon name="check-circle" /><div>{t("auth.forgot_sent")}</div></div>
      ) : (
        <>
          {error && <div className="callout callout-danger" role="alert"><Icon name="alert" /><div>{error}</div></div>}
          <div className="field">
            <label htmlFor="email">{t("auth.email")}</label>
            <input id="email" name="email" className="input" type="email" autoComplete="username" required autoFocus />
          </div>
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={pending}>{t("auth.send_link")}</button>
        </>
      )}
      <p className="small muted center"><Link href="/login">{t("auth.sign_in")}</Link></p>
    </form>
  );
}
