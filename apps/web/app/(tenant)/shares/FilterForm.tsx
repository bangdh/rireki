"use client";

import type { FormHTMLAttributes } from "react";

/** GET filter form that submits itself when one of its <select>s changes; chips and page numbers are submit buttons. */
export function FilterForm(props: FormHTMLAttributes<HTMLFormElement>) {
  return <form method="get" {...props} onChange={(e) => e.target instanceof HTMLSelectElement && e.currentTarget.requestSubmit()} />;
}
