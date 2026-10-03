"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { PasswordInput } from "@/components/PasswordInput";
import { authClient } from "@/lib/auth-client";

export function ResetForm({ token }: { token: string | null }) {
  const t = useTranslations();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : t("auth.invite_invalid"));
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setPending(true);
    await authClient.resetPassword(
      { newPassword: String(new FormData(e.currentTarget).get("password")), token },
      { onSuccess: () => setDone(true), onError: () => { setError(t("auth.invite_invalid")); setPending(false); } },
    );
  }

  return (
    <form className="auth-card" method="post" onSubmit={onSubmit}>
      <div>
        <h1>{t("auth.new_password")}</h1>
      </div>
      {done ? (
        <div className="callout callout-success"><Icon name="check-circle" /><div>{t("auth.reset_done")}</div></div>
      ) : (
        <>
          {error && <div className="callout callout-danger" role="alert"><Icon name="alert" /><div>{error}</div></div>}
          <div className="field">
            <label htmlFor="pw">{t("auth.new_password")}</label>
            <PasswordInput id="pw" name="password" className="input" minLength={10} required autoComplete="new-password" disabled={!token} style={{ paddingLeft: "12px", paddingRight: "40px" }} />
            <span className="hint">{t("signup.pw_hint")}</span>
          </div>
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={pending || !token}>{t("common.save")}</button>
        </>
      )}
      <p className="small muted center"><Link href={token || done ? "/login" : "/login/forgot"}>{token || done ? t("auth.sign_in") : t("auth.forgot_title")}</Link></p>
    </form>
  );
}
