"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { PasswordInput } from "@/components/PasswordInput";
import { authClient } from "@/lib/auth-client";

/**
 * Sign-in form of app/login.html through the better-auth client (native rate limit: 5 tries / 15 min → auth.err_locked).
 * `?next=/path` (same-origin paths only) is where to go afterwards: the invitation page sends existing users through here.
 */
export function LoginForm({ noAccess = false }: { noAccess?: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const after = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const [error, setError] = useState<string | null>(noAccess ? t("auth.err_no_access") : null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    await authClient.signIn.email(
      { email: String(data.get("email")), password: String(data.get("password")), rememberMe: data.get("remember") === "on" },
      {
        onSuccess: () => router.push(after),
        onError: (ctx) => {
          setError(t(ctx.error.status === 429 ? "auth.err_locked" : "auth.err_invalid"));
          setPending(false);
        },
      },
    );
  }

  return (
    <form className="auth-card" method="post" onSubmit={onSubmit}>
      <div>
        <h1>{t("auth.login_title")}</h1>
        <p className="muted mt-8">{t("auth.login_sub")}</p>
      </div>
      {error && (
        <div className="callout callout-danger" role="alert">
          <Icon name="alert" />
          <div>{error}</div>
        </div>
      )}
      <div className="field">
        <label htmlFor="email">{t("auth.email")}</label>
        <input id="email" name="email" className="input" type="email" autoComplete="username" required />
      </div>
      <div className="field">
        <div className="row between">
          <label htmlFor="pw">{t("auth.password")}</label>
          <Link href="/login/forgot" className="small">{t("auth.forgot")}</Link>
        </div>
        <PasswordInput id="pw" name="password" className="input" autoComplete="current-password" required style={{ paddingLeft: "12px", paddingRight: "40px" }} />
      </div>
      <label className="check"><input type="checkbox" name="remember" defaultChecked /><span>{t("auth.remember")}</span></label>
      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={pending}>{t("auth.sign_in")}</button>
      <p className="small muted center"><span>{t("auth.not_your_company")}</span> <Link href="/">{t("auth.go_main")}</Link></p>
    </form>
  );
}
