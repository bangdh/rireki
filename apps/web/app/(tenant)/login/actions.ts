"use server";

import { redirect } from "next/navigation";
import { SLUG_RE } from "@/lib/auth-schemas";
import { tenantUrl } from "@/lib/tenant";

/** Root-domain /login: "find your workspace" → the tenant's own login page. */
export async function findWorkspace(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!SLUG_RE.test(slug)) redirect("/login");
  redirect(`${tenantUrl(slug)}/login`);
}
