import { getFormatter, getTranslations } from "next-intl/server";

const DAY = 86_400_000;

/**
 * Localized moment as the mockups print it: "09:42 today" / "18:20 yesterday" (faint day word), otherwise the date
 * ("28 Sep 2026"), with " · 14:10" appended when `time` is set. Days and hours are taken in the request's time zone — the
 * tenant's meta.timezone from the Company tab (i18n/request.ts). Server component.
 */
export async function When({ date, time = false }: { date: Date; time?: boolean }) {
  const [t, f] = await Promise.all([getTranslations(), getFormatter()]);
  const day = (d: Date) => f.dateTime(d, { dateStyle: "medium" });
  const now = Date.now();
  const label = day(date);
  const relative = label === day(new Date(now)) ? "common.today" : label === day(new Date(now - DAY)) ? "common.yesterday" : null;
  const hm = f.dateTime(date, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  if (relative) {
    return (
      <>
        {hm} <span className="faint">{t(relative)}</span>
      </>
    );
  }
  return (
    <>
      {label}
      {time && ` · ${hm}`}
    </>
  );
}
