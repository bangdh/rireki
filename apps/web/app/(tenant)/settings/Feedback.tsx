import { getTranslations } from "next-intl/server";
import { Icon } from "../../../components/Icon";

/** "Saved" / error callout driven by ?saved=1 / ?error=<key> after a settings Server Action redirects back. */
export async function Feedback({ saved, error }: { saved?: boolean; error?: string | null }) {
  const t = await getTranslations();
  if (error) {
    return (
      <div className="callout callout-danger" role="alert">
        <Icon name="alert" />
        <div>{error}</div>
      </div>
    );
  }
  if (!saved) return null;
  return (
    <div className="callout callout-success" role="status">
      <Icon name="check-circle" />
      <div>{t("ui.saved")}</div>
    </div>
  );
}
