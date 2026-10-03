import { prisma } from "@rireki/db";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { getSession, getTenant } from "@/lib/tenant";
import { AuthFrame, tenantBranding } from "../../AuthFrame";
import { InviteForm } from "./InviteForm";

// Target of the invitation mail (/login/invite/{id} on the tenant host). Ids of other tenants, cancelled or expired invitations are invalid here.
// An invitee who already has an account signs in first (no password is asked here: the sign-in form has the rate limit) and comes back.
export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const tenant = await getTenant();
  const branding = await tenantBranding();
  const invitation = await prisma.invitation.findFirst({ where: { id, organizationId: tenant.id, status: "pending", expiresAt: { gt: new Date() } } });
  if (!invitation) {
    return (
      <AuthFrame tenant={branding}>
        <div className="auth-card">
          <div className="callout callout-danger"><Icon name="alert" /><div>{t("auth.invite_invalid")}</div></div>
          <p className="small muted center"><Link href="/login">{t("auth.sign_in")}</Link></p>
        </div>
      </AuthFrame>
    );
  }
  const existing = await prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
  if (existing && (await getSession())?.user.email !== invitation.email) redirect(`/login?next=/login/invite/${id}`);
  return (
    <AuthFrame tenant={branding}>
      <InviteForm id={id} email={invitation.email} org={tenant.name} existing={Boolean(existing)} />
    </AuthFrame>
  );
}
