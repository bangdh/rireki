import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";

// HTTP 403 for the User role on any /settings/* page, rendered inside the settings layout so the sidebar stays.
export default async function SettingsForbidden() {
  const t = await getTranslations();
  return (
    <div className="stack-lg">
      <div className="callout callout-danger">
        <Icon name="ban" />
        <div>{t("track.a_failed")}</div>
      </div>
    </div>
  );
}
