"use server";

import { prisma } from "@rireki/db";
import { LinkDefaults } from "@rireki/shared";
import { redirect } from "next/navigation";
import { audit, requireRole } from "@/lib/tenant";

/** Share-link defaults (app/settings-company.html #security) → TenantSettings.linkDefaults, read by the shares lane. */
export async function saveLinkDefaults(formData: FormData) {
  const { tenant } = await requireRole("admin");
  const on = (name: string) => formData.get(name) === "on";
  const expiry = formData.get("expiryDays");
  const linkDefaults = LinkDefaults.parse({
    password: on("password"),
    passwordLocked: on("passwordLocked"),
    viewOnly: on("viewOnly"),
    viewOnlyLocked: on("viewOnlyLocked"),
    identity: on("identity"),
    identityLocked: on("identityLocked"),
    showContact: on("showContact"),
    expiryDays: expiry ? Number(expiry) : null,
    protection: formData.get("protection"),
  });
  await prisma.tenantSettings.update({ where: { tenantId: tenant.id }, data: { linkDefaults } });
  await audit("settings.security", `viewOnly ${linkDefaults.viewOnly}${linkDefaults.viewOnlyLocked ? " (locked)" : ""} · expiry ${linkDefaults.expiryDays ?? "none"} · ${linkDefaults.protection}`);
  redirect("/settings/security?saved=1");
}
