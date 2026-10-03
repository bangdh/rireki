"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { uploadLogo } from "./actions";

const FORM_ID = "logo-upload";

/** The upload form itself. Rendered next to (never inside) the tab's own <form>, since forms cannot nest; its file input lives in <LogoUpload/>. */
export function LogoForm({ back }: { back: "company" | "branding" }) {
  return (
    <form id={FORM_ID} action={uploadLogo} hidden>
      <input type="hidden" name="back" value={back} />
    </form>
  );
}

/** Logo preview + "Change logo"/"Upload" button: picking a file submits <LogoForm/> at once (linked through the form attribute). */
export function LogoUpload({ label, className, style, children }: { label: string; className: string; style?: CSSProperties; children: ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={className} style={style}>
      {children}
      <input ref={input} type="file" name="logo" form={FORM_ID} accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.currentTarget.files?.length && e.currentTarget.form?.requestSubmit()} />
      <button className="btn btn-sm" type="button" onClick={() => input.current?.click()}>{label}</button>
    </div>
  );
}
