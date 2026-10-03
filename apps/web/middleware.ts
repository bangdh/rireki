import { NextResponse, type NextRequest } from "next/server";

// Subdomain → request header x-tenant (tenant-auth skill): saoviet.rireki.app → "saoviet"; the root domain and the
// infrastructure hosts carry no tenant. Read with headers().get("x-tenant") in lib/tenant.ts. APP_DOMAIN is read
// here directly because middleware runs on the edge runtime, outside lib/env.ts.
// x-forwarded-host first: Caddy sets it to the visitor's host, Next sets it from Host when absent, and Next's inline
// render of a Server Action redirect() re-fetches the page from http://localhost:PORT with only this header intact.
export function middleware(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const root = process.env.APP_DOMAIN!; // rireki.app | localhost:3000
  const slug = host.endsWith("." + root) ? host.slice(0, -root.length - 1) : null;
  const headers = new Headers(req.headers);
  headers.delete("x-tenant"); // never trust a client-sent value
  if (slug && !["www", "s3", "design"].includes(slug)) headers.set("x-tenant", slug);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
