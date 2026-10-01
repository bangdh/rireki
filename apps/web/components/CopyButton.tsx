"use client";

import { useTranslations } from "next-intl";
import type { ButtonHTMLAttributes } from "react";
import { toast } from "./Toast";

/** Copies `text` to the clipboard and toasts "Copied" (port of data-copy in assets/app.js). Same classes as a .btn. */
export function CopyButton({ text, children, ...rest }: { text: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const t = useTranslations("ui");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable (insecure context): nothing else to do
    }
    toast(t("copied"));
  }
  return (
    <button type="button" onClick={copy} {...rest}>
      {children}
    </button>
  );
}
