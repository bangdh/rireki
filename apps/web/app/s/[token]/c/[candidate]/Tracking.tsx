"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Icon } from "@/components/Icon";
import type { ViewerEventInput } from "@/lib/shares/events";

/** POST /api/s/{token}/events; resolves to the JSON body ({ id }) or null. Never throws (tracking must not break viewing). */
export function postEvent(token: string, body: ViewerEventInput): Promise<{ id?: string } | null> {
  return fetch(`/api/s/${token}/events`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true })
    .then((r) => (r.ok ? (r.json() as Promise<{ id?: string }>) : null))
    .catch(() => null);
}

/**
 * Heartbeat every 30 s while the 履歴書 is open (durationSec of the page's open_cv row) and, on view-only links,
 * a blocked_action row for the context menu, Ctrl/⌘+P/S/C and PrintScreen (ProtectedPage does the blocking).
 */
export function Tracking({ token, eventId, candidateId, protect }: { token: string; eventId: string; candidateId: string; protect: boolean }) {
  useEffect(() => {
    const beat = setInterval(() => {
      if (!document.hidden) void postEvent(token, { type: "heartbeat", eventId });
    }, 30_000);
    const blocked = (action: string, keys?: string) => void postEvent(token, { type: "blocked_action", action, keys, candidateId });
    const onMenu = () => blocked("contextmenu");
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["p", "s", "c"].includes(k)) blocked(k === "p" ? "print" : k === "s" ? "save" : "copy", `${e.metaKey ? "⌘" : "Ctrl"}+${k.toUpperCase()}`);
      if (k === "printscreen") blocked("screenshot", "PrintScreen");
    };
    if (protect) {
      document.addEventListener("contextmenu", onMenu);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      clearInterval(beat);
      document.removeEventListener("contextmenu", onMenu);
      document.removeEventListener("keydown", onKey);
    };
  }, [token, eventId, candidateId, protect]);
  return null;
}

/** Download-allowed links: "Print" logs a download event, then opens the browser's print dialog. */
export function PrintButton({ token, candidateId }: { token: string; candidateId: string }) {
  const t = useTranslations();
  return (
    <button
      className="btn btn-sm"
      type="button"
      onClick={async () => {
        await postEvent(token, { type: "download", candidateId });
        window.print();
      }}
    >
      <Icon name="printer" /><span>{t("common.print")}</span>
    </button>
  );
}
