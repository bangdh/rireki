// render.pages { tenantId, candidateId, version, hide? }: the web print route → PDF (Chromium paginates with @page) → PNG per
// page with pdftoppm, into rireki-renders/…/render/v{version}/ plus Render rows (media-pipeline skill). Without `hide` the job
// renders the full pages and the default link variant (contact hidden); with it, that one variant (the viewer cv route asks for
// the sections of a link). Idempotent: a variant whose page 1 is already on S3 is skipped; keys are deterministic and overwritten.
import { prisma } from "@rireki/db";
import { ShareSections } from "@rireki/shared";
import type { Job } from "bullmq";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { env } from "../env";
import { HIDEABLE, type Hideable, pdfKey, renderKey, renderVersion, variantOf } from "../keys";
import { enqueueRender } from "../queue";
import { run } from "../run";
import { BUCKET, objectExists, uploadFile } from "../s3";

export type RenderPagesJob = { tenantId: string; candidateId: string; version: number; hide?: Hideable[] };
/** What a new link hides by default (ShareSections: contact off): pre-rendered so its first viewer waits for nothing. */
const DEFAULT_HIDE: Hideable[] = HIDEABLE.filter((s) => !ShareSections.parse({})[s]);

/** pdftoppm names pages page-1.png … or page-01.png … depending on the count: → sorted [page number, path]. */
async function pngPages(dir: string): Promise<[number, string][]> {
  return (await readdir(dir))
    .map((f) => [Number(/^page-(\d+)\.png$/.exec(f)?.[1]), join(dir, f)] as [number, string])
    .filter(([n]) => Number.isInteger(n))
    .sort((a, b) => a[0] - b[0]);
}

export async function renderPages(job: Job<RenderPagesJob>): Promise<unknown> {
  const { tenantId, candidateId, version, hide } = job.data;
  const todo: Hideable[][] = [];
  for (const h of hide ? [hide] : [[], DEFAULT_HIDE]) {
    if (!(await objectExists(BUCKET.renders, renderKey(tenantId, candidateId, version, 1, variantOf(h))))) todo.push(h);
  }
  if (todo.length === 0) return { skipped: "exists" };

  const dir = await mkdtemp(join(tmpdir(), "render-"));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ colorScheme: "light" });
    // The key travels as a header, and only to the print route: the page also loads fonts from Google.
    await page.route(`${env.WEB_INTERNAL_URL}/print/**`, (route) => route.continue({ headers: { ...route.request().headers(), "x-render-key": env.RENDER_SECRET } }));
    let pages = 0;
    for (const h of todo) {
      const variant = variantOf(h);
      const res = await page.goto(`${env.WEB_INTERNAL_URL}/print/candidates/${candidateId}?v=${version}&hide=${h.join(",")}`, { waitUntil: "load", timeout: 60_000 });
      if (res?.status() === 409) return { skipped: "invalid_cv" };
      if (!res?.ok()) throw new Error(`print route answered ${res?.status()} for ${candidateId}`);
      await page.evaluate(() => document.fonts.ready);
      const out = join(dir, variant.slice(1) || "full");
      await mkdir(out);
      const pdf = join(out, "rirekisho.pdf");
      await page.pdf({ path: pdf, format: "A4", printBackground: true, preferCSSPageSize: true });
      await run("pdftoppm", ["-r", "200", "-png", pdf, join(out, "page")]);
      const pngs = await pngPages(out);
      if (pngs.length === 0) throw new Error("pdftoppm produced no pages");
      await uploadFile(BUCKET.renders, pdfKey(tenantId, candidateId, version, variant), pdf, "application/pdf");
      for (const [n, path] of pngs) await uploadFile(BUCKET.renders, renderKey(tenantId, candidateId, version, n, variant), path, "image/png");
      pages = pngs.length;
    }
    await prisma.$transaction([
      ...Array.from({ length: pages }, (_, i) => {
        const page = i + 1;
        const key = renderKey(tenantId, candidateId, version, page);
        return prisma.render.upsert({ where: { candidateId_version_page: { candidateId, version, page } }, create: { tenantId, candidateId, version, page, key }, update: { key } });
      }),
      prisma.render.deleteMany({ where: { tenantId, candidateId, version: { lt: version } } }),
    ]);
    return { pages, variants: todo.map(variantOf) };
  } finally {
    await browser.close();
    await rm(dir, { recursive: true, force: true });
  }
}

/** On worker boot: queue a render for every candidate whose newest Render.version is not renderVersion(updatedAt) (seeded rows included). */
export async function sweepRenders(): Promise<number> {
  const [candidates, newest] = await Promise.all([
    prisma.candidate.findMany({ select: { id: true, tenantId: true, updatedAt: true } }),
    prisma.render.groupBy({ by: ["candidateId"], _max: { version: true } }),
  ]);
  const have = new Map(newest.map((r) => [r.candidateId, r._max.version]));
  let queued = 0;
  for (const c of candidates) {
    const version = renderVersion(c.updatedAt);
    if (have.get(c.id) === version) continue;
    await enqueueRender(c.tenantId, c.id, version);
    queued++;
  }
  return queued;
}
