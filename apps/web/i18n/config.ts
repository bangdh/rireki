import type { Locale } from "@rireki/shared";

// Client-safe i18n constants (no server imports). The locale lives in a cookie because the app is per subdomain
// and the mockups switch language in place (no /{locale} prefix in URLs).
export const LOCALE_COOKIE = "rireki.lang";

// Same order and native names as the language switcher in assets/app.js.
export const LANGS: ReadonlyArray<readonly [Locale, string]> = [
  ["en", "English"],
  ["ja", "日本語"],
  ["vi", "Tiếng Việt"],
  ["my", "မြန်မာ"],
  ["id", "Bahasa Indonesia"],
];
