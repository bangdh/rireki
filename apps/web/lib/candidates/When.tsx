import { getFormatter, getTranslations } from "next-intl/server";

const DAY = 86_400_000;

/**
 * Localized moment as the mockups print it: "09:42 today" / "18:20 yesterday" (faint day word), otherwise the date
 * ("28 Sep 2026"), with " · 14:10" appended when `time` is set. Days and hours are taken in `timeZone` — the tenant's
 * meta.timezone from the Company tab — and in the server's zone when it is not set. Server component.
 */
export async function When({ date, time = false, timeZone }: { date: Date; time?: boolean; timeZone?: string }) {
  const [t, f] = await Promise.all([getTranslations(), getFormatter()]);
  const day = (d: Date) => f.dateTime(d, { timeZone, dateStyle: "medium" });
  const now = Date.now();
  const label = day(date);
  const relative = label === day(new Date(now)) ? "common.today" : label === day(new Date(now - DAY)) ? "common.yesterday" : null;
  const hm = f.dateTime(date, { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
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
