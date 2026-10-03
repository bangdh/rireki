import { DEFAULT_LOCALE, LOCALES, type Locale } from "@rireki/shared";
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { getTenant, tenantSlug } from "@/lib/tenant";
import { LOCALE_COOKIE } from "./config";
import { MESSAGES } from "./messages";

const isLocale = (v: string | undefined): v is Locale => (LOCALES as readonly string[]).includes(v ?? "");

export default getRequestConfig(async ({ requestLocale }) => {
  // 1. a page pinned the locale with setRequestLocale() (viewer pages: the share link's viewerLang),
  // 2. the cookie written by <LangSwitch/>, 3. English — the mockups' default.
  const requested = (await requestLocale) ?? (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;
  // Dates and times (f.dateTime, <When>, the client useFormatter, the 履歴書 date) in the tenant's zone from the Company tab;
  // off a tenant host the server's. getTenant() is cached per request; an unknown subdomain 404s in the page, not here.
  const timeZone = (await tenantSlug()) ? await getTenant().then((t) => t.meta.timezone, () => undefined) : undefined;
  return { locale, messages: MESSAGES[locale], timeZone };
});
