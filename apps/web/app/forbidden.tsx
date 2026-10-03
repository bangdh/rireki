import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/Icon";

// Rendered with HTTP 403 when requireRole() calls forbidden() outside the settings section (experimental.authInterrupts).
export default async function Forbidden() {
  const t = await getTranslations();
  return (
    <main className="main" id="main">
      <div className="callout callout-danger">
        <Icon name="ban" />
        <div>
          <b>{t("track.a_failed")}</b> · <Link href="/dashboard">{t("nav.dashboard")}</Link>
        </div>
      </div>
    </main>
  );
}
