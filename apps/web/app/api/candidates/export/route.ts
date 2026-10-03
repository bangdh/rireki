import { prisma } from "@rireki/db";
import { getTranslations } from "next-intl/server";
import { logEvent } from "@/lib/candidates/activity";
import { csvLine } from "@/lib/candidates/format";
import { IdsInput } from "@/lib/candidates/schemas";
import { requireRole } from "@/lib/tenant";

/** GET /api/candidates/export?id=…&id=… → CSV (UTF-8 BOM so Excel reads the names). Admin only (perm.export). */
export async function GET(req: Request) {
  const { tenant, user } = await requireRole("admin");
  const ids = IdsInput.safeParse(new URL(req.url).searchParams.getAll("id"));
  if (!ids.success) return new Response("Bad request", { status: 400 });
  const [t, rows] = await Promise.all([
    getTranslations(),
    prisma.candidate.findMany({ where: { tenantId: tenant.id, id: { in: ids.data } }, orderBy: { code: "asc" }, include: { _count: { select: { videos: true } } } }),
  ]);
  const header = [t("cand.code"), t("form.name_romaji"), t("form.name_kana"), t("form.name_native"), t("form.dob"), t("form.gender"), t("cand.nationality"), "JLPT", t("form.internal_tags"), t("common.status"), t("cand.video"), t("form.completeness"), t("common.updated")];
  const lines = rows.map((c) =>
    csvLine([c.code, c.nameLatin, c.nameKana, c.nameNative, c.dob?.toISOString().slice(0, 10), c.gender, c.nationality, c.jlpt, c.tags.join(" "), c.status, c._count.videos, c.completeness, c.updatedAt.toISOString()]),
  );
  await logEvent({ tenantId: tenant.id, userId: user.id, action: "candidate.export", meta: { count: rows.length } });
  return new Response(`﻿${[csvLine(header), ...lines].join("\r\n")}\r\n`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="candidates.csv"', "cache-control": "no-store" },
  });
}
