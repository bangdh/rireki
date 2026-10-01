"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const KEY = "rireki.theme"; // read before paint by THEME_INIT in app/layout.tsx

function effectiveTheme() {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "dark" || set === "light") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Light/dark toggle (port of initTheme in assets/app.js): sets html[data-theme] and remembers it. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(effectiveTheme() === "dark"), []);
  function toggle() {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    setDark(next === "dark");
  }
  return (
    <button className="btn btn-ghost btn-icon" type="button" onClick={toggle} aria-label="Toggle theme">
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}
