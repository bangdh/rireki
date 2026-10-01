"use client";

import { useState } from "react";
import { Icon } from "./Icon";

/** Masked value with a reveal button, e.g. a share-link password inside a .link-box. */
export function SecretText({ value, mask = "••••-••••-•••" }: { value: string; mask?: string }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <span className="url">{show ? value : mask}</span>
      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide" : "Show"}>
        <Icon name={show ? "eye-off" : "eye"} />
      </button>
    </>
  );
}
