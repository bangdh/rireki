"use client";

import { Icon } from "../Icon";

// The sidebar drawer state is body.sidebar-open (see globals.css), toggled by the hamburger and closed by the scrim/nav links.
const setOpen = (open?: boolean) => document.body.classList.toggle("sidebar-open", open);

export function NavToggle() {
  return (
    <button className="btn btn-ghost btn-icon hamburger" type="button" onClick={() => setOpen()} aria-label="Menu">
      <Icon name="menu" />
    </button>
  );
}

export function Scrim() {
  return <div className="scrim" onClick={() => setOpen(false)} />;
}
