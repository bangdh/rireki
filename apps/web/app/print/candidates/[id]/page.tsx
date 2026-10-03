import { timingSafeEqual } from "node:crypto";
import { prisma } from "@rireki/db";
import { CvSchema } from "@rireki/shared";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Rirekisho } from "@/components/rirekisho/Rirekisho";
import { parseOrgMeta } from "@/lib/auth-schemas";
import { env } from "@/lib/env";
import { stripSections } from "@/lib/shares/format";
import { HIDEABLE, type Hideable } from "@/lib/storage/keys";
import { BUCKET, getObject } from "@/lib/storage/s3";

type Search = { hide?: string | string[]; v?: string | string[] };
const one = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

// Loopback and private ranges (the rule of api/internal/tls/ask): the worker reaches web:3000 inside the docker network, or
// localhost in dev; browsers always arrive through Caddy with their public IP in x-forwarded-for.
// TODO(integration): share the regex with that route.
const PRIVATE_IP = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|::ffff:(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|f[cd][0-9a-f]{2}:|fe80:)/i;

/** Only the worker's Playwright: x-render-key = RENDER_SECRET (a header, so the key reaches no access log or Referer) from an internal address. */
async function fromWorker(): Promise<boolean> {
  const h = await headers();
  const key = h.get("x-render-key");
  const client = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!key || (client && !PRIVATE_IP.test(client))) return false;
  const given = Buffer.from(key);
  const secret = Buffer.from(env.RENDER_SECRET);
  return given.length === secret.length && timingSafeEqual(given, secret);
}

/** The photo as a data: URL so Chromium needs no S3 access (and no presigned URL leaks into the PDF). */
async function photoDataUrl(key: string): Promise<string | undefined> {
  try {
    const { body, contentType } = await getObject(BUCKET.originals, key);
    return `data:${contentType ?? "image/jpeg"};base64,${body.toString("base64")}`;
  } catch {
    return undefined;
  }
}

/**
 * GET /print/candidates/{id}?v={version}&hide=contact,family,health,photo — the worker's Playwright only (fromWorker; the key
 * authorises any tenant's candidate, hence no tenant on the lookup). `hide` drops the blocks a share link switches off, as the
 * viewer page's stripSections does; `v` only busts caches. Renders nothing but the 履歴書; a CV that fails CvSchema answers 409
 * via /print/invalid so render.pages records "skipped". Staff export/print use /api/candidates/{id}/pdf (candidates lane).
 */
export default async function PrintCandidatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const { id } = await params;
  const search = await searchParams;
  if (!(await fromWorker())) notFound();
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) notFound();
  const parsed = CvSchema.safeParse(candidate.cv);
  if (!parsed.success) redirect("/print/invalid");
  const hide = (one(search.hide) ?? "").split(",").filter((s): s is Hideable => (HIDEABLE as readonly string[]).includes(s));
  const hidden = (block: Hideable) => hide.includes(block);
  const photoUrl = !hidden("photo") && candidate.photoKey ? await photoDataUrl(candidate.photoKey) : undefined;
  // The component prints 送出機関の設定により非表示 for the hidden contact, family, health and photo blocks; dropping the values keeps them out of the HTML too.
  const cv = stripSections(hidden("contact") ? { ...parsed.data, mobile: undefined, email: undefined, address: undefined } : parsed.data, { family: !hidden("family"), health: !hidden("health") });
  // No tenant host here, so the 「現在」 date gets the tenant's zone explicitly (the detail page and viewer get it from i18n/request.ts).
  const org = await prisma.organization.findUnique({ where: { id: candidate.tenantId }, select: { metadata: true } });
  return <Rirekisho cv={cv} asOf={candidate.updatedAt} photoUrl={photoUrl} hideContact={hidden("contact")} hideFamily={hidden("family")} hideHealth={hidden("health")} hidePhoto={hidden("photo")} timeZone={parseOrgMeta(org?.metadata).timezone} />;
}
