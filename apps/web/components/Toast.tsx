"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

type Item = { id: number; text: string; warn: boolean; fading: boolean };
const EVENT = "rireki:toast";

/** Shows a toast from any client code (port of toast() in assets/app.js). The host is <Toasts/> in the root layout. */
export function toast(text: string, kind?: "warn") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { text, warn: kind === "warn" } }));
}

export function Toasts() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    let seq = 0;
    const onToast = (e: Event) => {
      const id = ++seq;
      const { text, warn } = (e as CustomEvent<{ text: string; warn: boolean }>).detail;
      setItems((list) => [...list, { id, text, warn, fading: false }]);
      setTimeout(() => setItems((list) => list.map((t) => (t.id === id ? { ...t, fading: true } : t))), 2400);
      setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 2700);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);
  return (
    <div className="toasts" id="toasts">
      {items.map((t) => (
        <div key={t.id} className={t.warn ? "toast warn" : "toast"} role="status" style={t.fading ? { opacity: 0, transition: "opacity .25s" } : undefined}>
          <Icon name={t.warn ? "ban" : "check-circle"} className="ic-sm" />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
