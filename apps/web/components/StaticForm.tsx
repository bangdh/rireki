"use client";

import type { FormHTMLAttributes } from "react";

/**
 * Placeholder <form> for the static foundation pages: it never submits, so no field (e.g. a password) ends up in the
 * URL. Feature lanes replace it with <form action={serverAction}> and zod validation.
 */
export function StaticForm(props: FormHTMLAttributes<HTMLFormElement>) {
  return <form {...props} onSubmit={(e) => e.preventDefault()} />;
}
