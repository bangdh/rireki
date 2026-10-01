import type { Locale } from "@rireki/shared";
import en from "@rireki/shared/messages/en";
import id from "@rireki/shared/messages/id";
import ja from "@rireki/shared/messages/ja";
import my from "@rireki/shared/messages/my";
import vi from "@rireki/shared/messages/vi";

// Generated from assets/i18n.js by `pnpm --filter @rireki/shared gen:messages`; en.json types every t() key.
export type Messages = typeof en;

export const MESSAGES: Record<Locale, Messages> = { en, ja, vi, id, my };
