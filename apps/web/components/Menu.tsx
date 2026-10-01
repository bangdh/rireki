"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** <details class="menu"> dropdown that closes when clicking elsewhere (port of initShell in assets/app.js). Children: <summary> + <div class="menu-list">. */
export function Menu({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      const d = ref.current;
      if (d?.open && !d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  return (
    <details className="menu" ref={ref}>
      {children}
    </details>
  );
}
