import { prisma } from "@rireki/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { LOCALE_COOKIE } from "@/i18n/config";
import { sendResetMail } from "./auth-mail";
import { asLocale } from "./auth-schemas";
import { env } from "./env";

const DAY = 60 * 60 * 24;
const protocol = new URL(env.APP_URL).protocol; // "https:" | "http:"

// Auth is driven by the app, not by better-auth's HTTP API: sign-up happens in the signup action (auth.api.signUpEmail), the
// organization plugin's endpoints (create/update/delete, invitations, members) are replaced by the Server Actions under
// settings/members and login/invite, which check requireRole()/guard() and write AuditLog rows. Browser calls to those
// endpoints get a 404; server auth.api.* calls carry no ctx.request and still pass.
const HIDDEN_FROM_HTTP = (path: string) => path === "/sign-up/email" || path.startsWith("/organization/");

// The UI language of the person asking for a reset, from the cookie <LangSwitch/> writes.
const localeOf = (request?: Request) => asLocale(request?.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE.replace(".", "\\.")}=([a-z]{2})`))?.[1]);

/**
 * better-auth server instance (server-side only). The base URL is resolved per request from the Host header (Caddy
 * preserves it), restricted to the root domain and its subdomains, so callback URLs in mails (password reset) point at
 * the tenant subdomain the user is on; server calls without headers fall back to APP_URL. Organization = tenant; its
 * owner/admin roles are Rireki Admin.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.SESSION_SECRET,
  baseURL: { allowedHosts: [env.APP_DOMAIN, `*.${env.APP_DOMAIN}`], fallback: env.APP_URL, protocol: protocol === "https:" ? "https" : "http" },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: false,
    sendResetPassword: async ({ user, url }, request) => {
      await sendResetMail(localeOf(request), { to: user.email, url });
    },
  },
  session: { expiresIn: 7 * DAY, updateAge: DAY },
  rateLimit: { enabled: true, customRules: { "/sign-in/email": { window: 900, max: 5 } } },
  trustedOrigins: [env.APP_URL, `${protocol}//*.${env.APP_DOMAIN}`],
  advanced: { useSecureCookies: protocol === "https:" },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.request && HIDDEN_FROM_HTTP(ctx.path)) throw new APIError("NOT_FOUND");
    }),
  },
  databaseHooks: {
    session: {
      create: {
        // Every sign-in is an audit row of the user's (single, phase 1) tenant.
        after: async (session) => {
          const member = await prisma.member.findFirst({ where: { userId: session.userId }, select: { organizationId: true } });
          if (!member) return;
          await prisma.auditLog.create({
            data: { tenantId: member.organizationId, userId: session.userId, action: "auth.login", target: session.userAgent ?? null, ip: session.ipAddress ?? null },
          });
        },
      },
    },
  },
  plugins: [
    // Organizations are created by the signup action only (a session-less call with userId is a system action and passes).
    organization({ allowUserToCreateOrganization: false, disableOrganizationDeletion: true, invitationExpiresIn: 7 * DAY, membershipLimit: 100 }),
    nextCookies(),
  ],
});
