"use client";

import { usePathname, useRouter } from "next/navigation";

/** The date input of the audit tab: picking a day re-renders the list with ?date=YYYY-MM-DD (rows up to the end of that day). */
export function DateFilter({ value, label }: { value: string; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return <input className="input input-sm" type="date" defaultValue={value} aria-label={label} onChange={(e) => router.replace(e.target.value ? `${pathname}?date=${e.target.value}` : pathname)} />;
}
