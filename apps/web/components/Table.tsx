"use client";

import { useEffect, useRef, type TableHTMLAttributes } from "react";

/**
 * <table className="table"> whose cells get data-label (and data-card-title/-check/-actions) from the header row,
 * so globals.css can render rows as cards under 640px. Port of labelTables() in assets/app.js.
 */
export function Table({ children, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  const ref = useRef<HTMLTableElement>(null);
  useEffect(() => {
    const table = ref.current;
    if (!table) return;
    const heads = Array.from(table.querySelectorAll("thead th"), (th) => th.textContent?.trim() ?? "");
    for (const tr of table.querySelectorAll("tbody tr")) {
      let titled = false;
      const cells = Array.from(tr.children).filter((c): c is HTMLTableCellElement => c.tagName === "TD");
      cells.forEach((td, i) => {
        const label = heads[i] ?? "";
        td.dataset.label = label;
        const onlyCheckbox = td.children.length === 1 && td.firstElementChild!.matches("input[type=checkbox]");
        if (!titled && (td.querySelector(".person, .cell-primary") || (i === 0 && td.querySelector("a.strong")))) {
          td.toggleAttribute("data-card-title", true);
          titled = true;
        } else if (onlyCheckbox) td.toggleAttribute("data-card-check", true);
        else if (td.querySelector(".row-actions") || (label === "" && td.querySelector(".btn") && !td.querySelector(".input, .select")))
          td.toggleAttribute("data-card-actions", true);
      });
    }
  });
  return (
    <table ref={ref} {...rest}>
      {children}
    </table>
  );
}
