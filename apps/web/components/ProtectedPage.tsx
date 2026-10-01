"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Icon } from "./Icon";
import { toast } from "./Toast";

/**
 * View-only protections for client (viewer) pages, port of initProtection in assets/app.js: body.protected/no-print,
 * blocked context menu, copy, drag and shortcuts, blur while the window is inactive. Renders the blur shield.
 * OS screenshots cannot be prevented by a web page; the watermark makes them traceable.
 */
export function ProtectedPage({ printMessage }: { printMessage: string }) {
  const t = useTranslations();
  useEffect(() => {
    const body = document.body;
    body.classList.add("protected", "no-print");
    body.dataset.printMsg = printMessage;
    let lastToast = 0;
    const warn = (key: "blocked" | "screenshot") => {
      const now = Date.now();
      if (now - lastToast > 1200) {
        toast(t(`ui.${key}`), "warn");
        lastToast = now;
      }
    };
    const prevent = (e: Event) => e.preventDefault();
    const block = (e: Event) => {
      e.preventDefault();
      warn("blocked");
    };
    const hide = () => body.classList.add("is-inactive");
    const show = () => body.classList.remove("is-inactive");
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["s", "p", "u", "c", "a", "x"].includes(k)) block(e);
      if (k === "printscreen" || (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(k))) {
        e.preventDefault();
        hide();
        warn("screenshot");
        setTimeout(show, 1800);
      }
      if (k === "f12") e.preventDefault();
    };
    const onVisibility = () => (document.hidden ? hide() : show());
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("cut", prevent);
    document.addEventListener("dragstart", prevent);
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", prevent);
      document.removeEventListener("dragstart", prevent);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
      body.classList.remove("protected", "no-print", "is-inactive");
    };
  }, [t, printMessage]);
  return (
    <div
      className="blur-shield"
      onClick={() => {
        document.body.classList.remove("is-inactive");
        window.focus();
      }}
    >
      <div className="box">
        <Icon name="eye-off" className="ic-xl" style={{ color: "var(--warning)" }} />
        <b>{t("viewer.hidden_t")}</b>
        <span className="small muted">{t("viewer.hidden_d")}</span>
      </div>
    </div>
  );
}
