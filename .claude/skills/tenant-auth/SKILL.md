---
name: tenant-auth
description: Tenant resolution by subdomain, better-auth setup (email + password, organization plugin as tenant, Admin/User roles), session helpers, invitations, and the Caddy on-demand TLS "ask" route. Load before touching login, signup, members, middleware or anything that needs the current tenant/user.
---
# Tenant & auth (better-auth)

## Model

Tenant = better-auth `Organization` (`slug` = subdomain, e.g. `saoviet`). Roles: organization `owner`/`admin` →
Rireki **Admin**, `member` → **User**. Users belong to exactly one organization in phase 1.

## Setup (apps/web/lib/auth.ts)

```ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { prisma } from "@rireki/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  advanced: { crossSubDomainCookies: { enabled: false } }, // a session is per subdomain on purpose
  plugins: [organization({ allowUserToCreateOrganization: true, membershipLimit: 100 })],
  trustedOrigins: [`https://*.${process.env.APP_DOMAIN}`],
});
```

Route handler: `app/api/auth/[...all]/route.ts` → `export const { GET, POST } = toNextJsHandler(auth)`.
Client: `lib/auth-client.ts` → `createAuthClient({ plugins: [organizationClient()] })`.
Generate the Prisma models: `npx @better-auth/cli generate` into `packages/db/prisma/schema.prisma`.

## Tenant resolution (apps/web/middleware.ts)

```ts
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const root = process.env.APP_DOMAIN!;                        // rireki.app
  const slug = host.endsWith("." + root) ? host.slice(0, -root.length - 1) : null; // "saoviet" | null
  const res = NextResponse.next();
  if (slug && !["www", "s3", "design"].includes(slug)) res.headers.set("x-tenant", slug);
  return res;
}
```
Local dev: use `saoviet.localhost:3000` (browsers resolve `*.localhost`), `APP_DOMAIN=localhost:3000`.

## Helpers (apps/web/lib/tenant.ts)

- `getTenant()` — reads `x-tenant`, loads `Organization` + `TenantSettings`; `notFound()` if missing. Cached per request.
- `getSession()` — `auth.api.getSession({ headers: await headers() })`; `requireUser()` redirects to `/login`.
- `requireMember(tenant)` — the session user must be a member of this organization; sets `role`.
- `requireRole("admin")` — owner/admin only (members, settings, revoke any link, exports).
- `audit(action, target)` — inserts `AuditLog` with tenantId, userId, ip.

## Flows

- **Sign-up** (`/signup` on the root domain): `auth.api.signUpEmail` → `organization.create({ name, slug })` →
  create `TenantSettings` (prefix from slug uppercased, 2 letters) → redirect to `https://{slug}.{domain}/login`.
- **Invite member**: `organization.inviteMember({ email, role })` → better-auth sends nothing by itself; send the
  email with `nodemailer` from the `sendInvitationEmail` hook; the accept page sets the password and joins.
- **Suspend/remove**: `organization.removeMember`; "suspended" = our flag on `Member` via `metadata` (keep it simple).
- **Password reset**: better-auth `forgetPassword` / `resetPassword` with our email template.

## Caddy on-demand TLS

`app/api/internal/tls/ask/route.ts`: `GET ?domain=saoviet.rireki.app` → 200 if the slug exists and is active,
else 404. Only reachable from the docker network (check `x-forwarded-for` absence or a shared header).
