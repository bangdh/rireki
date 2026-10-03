"use server";

import { prisma } from "@rireki/db";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { BUCKETS, formatCandidateCode } from "@rireki/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BrandingInput, CodeFormatInput, CompanyInput } from "@/lib/auth-schemas";
import { audit, requireRole } from "@/lib/tenant";
import { s3 } from "@/lib/usage";

// Company and Branding tabs of app/settings-company.html. Every action re-checks the Admin role, writes an AuditLog
// row and redirects back with ?saved=1 (or ?error=<key>) so the page shows the result.
const invalid = (issues: { message: string }[]) => new Error(issues.map((i) => i.message).join("; ")); // unreachable through the UI (HTML validation)

export async function saveCompany(formData: FormData) {
  const { tenant } = await requireRole("admin");
  const parsed = CompanyInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw invalid(parsed.error.issues);
  const d = parsed.data;
  const metadata = JSON.stringify({ ...tenant.meta, phone: d.phone, address: d.address, timezone: d.timezone });
  await prisma.$transaction([
    prisma.organization.update({ where: { id: tenant.id }, data: { name: d.nameLocal, metadata } }),
    prisma.tenantSettings.update({
      where: { tenantId: tenant.id },
      data: { nameJa: d.nameJa ?? null, nameEn: d.nameEn ?? null, country: d.country, licenseNo: d.licenseNo ?? null, defaultLang: d.defaultLang },
    }),
  ]);
  await audit("settings.company", d.nameLocal);
  revalidatePath("/", "layout"); // the shell shows the tenant name
  redirect("/settings/company?saved=1");
}

export async function saveCodeFormat(formData: FormData) {
  const { tenant } = await requireRole("admin");
  const parsed = CodeFormatInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw invalid(parsed.error.issues);
  const { prefix, nextCode } = parsed.data;
  if (nextCode < tenant.settings.nextCode) redirect("/settings/company?error=code_next"); // numbers are never reused
  await prisma.tenantSettings.update({ where: { tenantId: tenant.id }, data: { codePrefix: prefix, nextCode } });
  await audit("settings.code", formatCandidateCode(prefix, nextCode));
  redirect("/settings/company?saved=1");
}

export async function saveBranding(formData: FormData) {
  const { tenant } = await requireRole("admin");
  const parsed = BrandingInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw invalid(parsed.error.issues);
  const d = parsed.data;
  const metadata = JSON.stringify({ ...tenant.meta, displayName: d.displayName, poweredBy: d.poweredBy });
  await prisma.$transaction([
    prisma.organization.update({ where: { id: tenant.id }, data: { metadata } }),
    prisma.tenantSettings.update({ where: { tenantId: tenant.id }, data: { brandColor: d.brandColor, footer: d.footer ?? null } }),
  ]);
  await audit("settings.branding", `${d.brandColor} · ${d.displayName}`);
  redirect("/settings/branding?saved=1");
}

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** Logo (≤ 2 MB png/jpeg/webp) → rireki-public/tenants/{tenantId}/logo.{ext}; shared by the Company and Branding tabs (`back`). */
export async function uploadLogo(formData: FormData) {
  const { tenant } = await requireRole("admin");
  const back = formData.get("back") === "branding" ? "/settings/branding" : "/settings/company";
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_LOGO_BYTES || !EXT[file.type]) redirect(back); // TODO(phase2): an error message (the accept attribute filters the common cases)
  const key = `tenants/${tenant.id}/logo.${EXT[file.type]}`;
  // public-read: the logo is loaded by the browser straight from the public bucket (moto and MinIO honour the object ACL).
  // TODO(phase2): on AWS S3 with "bucket owner enforced" ownership, drop the ACL and rely on the bucket policy instead.
  await s3.send(new PutObjectCommand({ Bucket: BUCKETS.public, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type, ACL: "public-read" }));
  await prisma.tenantSettings.update({ where: { tenantId: tenant.id }, data: { logoKey: key } });
  await audit("settings.branding", key);
  redirect(`${back}?saved=1`);
}
