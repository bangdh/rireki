"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * Password field with the show/hide eye (port of data-pw-toggle in assets/app.js). `icon` = leading icon inside the
 * .input-wrap, `children` = extra trailing buttons (e.g. a <CopyButton/>). Pass the mockup's padding via `style`.
 */
export function PasswordInput({
  icon,
  defaultShown = false,
  children,
  ...input
}: { icon?: string; defaultShown?: boolean; children?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(defaultShown);
  return (
    <div className="input-wrap" style={{ display: "flex" }}>
      {icon && <Icon name={icon} />}
      <input {...input} type={show ? "text" : "password"} />
      <span className="trail row-nowrap" style={{ gap: 0 }}>
        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide" : "Show"}>
          <Icon name={show ? "eye-off" : "eye"} />
        </button>
        {children}
      </span>
    </div>
  );
}
