import type { Locale } from "@rireki/shared";
import type { Messages } from "./messages";

// Type-safe message keys: t("nav.dashboard") is checked against the generated en.json at typecheck time.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
