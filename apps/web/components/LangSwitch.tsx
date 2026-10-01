"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { LANGS, LOCALE_COOKIE } from "@/i18n/config";
import { Icon } from "./Icon";

/** Language selector (port of renderLangSwitchers): writes the locale cookie and re-renders the server tree. */
export function LangSwitch() {
  const locale = useLocale();
  const router = useRouter();
  return (
    <div className="lang-wrap">
      <Icon name="globe" className="ic-sm" />
      <select
        className="lang-select"
        aria-label="Language"
        value={locale}
        onChange={(e) => {
          document.cookie = `${LOCALE_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
      >
        {LANGS.map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
