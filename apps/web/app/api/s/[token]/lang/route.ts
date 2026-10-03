import { prisma } from "@rireki/db";
import { LOCALE_COOKIE } from "@/i18n/config";

/**
 * First visit of a viewer: sets the UI-language cookie to the link's viewerLang (when absent) and goes back to /s/{token}.
 * The cookie is the one <LangSwitch/> writes, so the root layout, the next-intl provider and client components render
 * in the viewer language (setRequestLocale alone would not reach the client provider). Relative Location on purpose:
 * req.url carries the server host, not the tenant subdomain the visitor is on.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await prisma.shareLink.findUnique({ where: { token }, select: { viewerLang: true } });
  if (!link) return new Response("Not found", { status: 404 });
  const headers = new Headers({ location: `/s/${token}` });
  if (!req.headers.get("cookie")?.includes(`${LOCALE_COOKIE}=`)) headers.append("set-cookie", `${LOCALE_COOKIE}=${link.viewerLang}; Path=/; Max-Age=31536000; SameSite=Lax`);
  return new Response(null, { status: 302, headers });
}
