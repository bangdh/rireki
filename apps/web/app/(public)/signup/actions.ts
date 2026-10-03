"use server";

import { prisma } from "@rireki/db";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { fieldErrors, prefixFromSlug, RESERVED_SLUGS, SignupInput, zodErrorMap } from "@/lib/auth-schemas";
import { tenantUrl } from "@/lib/tenant";

export type SignupState = { errors?: Record<string, string>; values?: Record<string, string> };

/** public/signup.html: user + organization (slug = subdomain, creator = owner) + TenantSettings → the tenant's /login. */
export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const values = Object.fromEntries([...formData.entries()].filter(([k, v]) => typeof v === "string" && k !== "password")) as Record<string, string>;
  const parsed = SignupInput.safeParse(Object.fromEntries(formData), zodErrorMap(await getLocale()));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const { company, country, lang, slug, name, email, password } = parsed.data;

  const t = await getTranslations("signup");
  const [slugTaken, emailTaken] = await Promise.all([
    prisma.organization.findUnique({ where: { slug }, select: { id: true } }),
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
  ]);
  // Reserved subdomains (www, api, …) read as taken: the same message, and nothing to localize beyond it.
  const errors = { ...((slugTaken || RESERVED_SLUGS.includes(slug)) && { slug: t("err_slug_taken") }), ...(emailTaken && { email: t("err_email_taken") }) };
  if (Object.keys(errors).length) return { errors, values };

  const { user } = await auth.api.signUpEmail({ body: { name, email, password } });
  // System call (userId in the body, no headers): creates the organization and its owner Member.
  // TODO(phase2): the user is orphaned if the slug is taken between the pre-check and this call.
  const org = await auth.api.createOrganization({ body: { name: company, slug, userId: user.id } });
  if (!org) throw new Error("createOrganization returned nothing");
  await prisma.tenantSettings.create({ data: { tenantId: org.id, codePrefix: prefixFromSlug(slug), country, defaultLang: lang } });
  // No audit row: there is no tenant session yet; the first sign-in writes auth.login.
  redirect(`${tenantUrl(slug)}/login`);
}
