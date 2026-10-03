"use client";

import { useState } from "react";

/** Brand colour: the colour picker and the hex text input mirror each other; only the text input is submitted (`name`). */
export function ColorField({ name, defaultValue, label }: { name: string; defaultValue: string; label: string }) {
  const [value, setValue] = useState(defaultValue);
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="row">
      <input
        id={name}
        type="color"
        value={valid ? value : defaultValue}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        style={{ width: "44px", height: "38px", border: "1px solid var(--border-strong)", borderRadius: "8px", background: "var(--surface)" }}
      />
      <input name={name} className="input mono" style={{ width: "120px" }} value={value} onChange={(e) => setValue(e.target.value)} pattern="#[0-9A-Fa-f]{6}" required aria-label={label} />
    </div>
  );
}
