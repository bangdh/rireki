import { prisma } from "@rireki/db";
import { env } from "@/lib/env";

// Loopback and private ranges: the docker network Caddy calls from, or localhost in dev. Next itself fills
// x-forwarded-for from the socket when the header is missing, so "absent" alone cannot identify Caddy's call.
const PRIVATE_IP = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|::ffff:(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|f[cd][0-9a-f]{2}:|fe80:)/i;

/**
 * Caddy on-demand TLS "ask" endpoint: GET ?domain=saoviet.rireki.app → 200 when that tenant exists (Organization with
 * TenantSettings, the same rule as getTenant()), else 404, so no certificate is ever requested for a bare organization row.
 * Only Caddy itself calls it from the docker network; browser traffic is proxied with the client's public IP
 * in x-forwarded-for → 404.
 */
export async function GET(req: Request) {
  const client = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (client && !PRIVATE_IP.test(client)) return new Response(null, { status: 404 });
  const domain = new URL(req.url).searchParams.get("domain") ?? "";
  const suffix = `.${env.APP_DOMAIN}`;
  const slug = domain.endsWith(suffix) ? domain.slice(0, -suffix.length) : null;
  const org = slug ? await prisma.organization.findUnique({ where: { slug }, select: { id: true } }) : null;
  const tenant = org ? await prisma.tenantSettings.count({ where: { tenantId: org.id } }) : 0;
  return new Response(null, { status: tenant ? 200 : 404 });
}
