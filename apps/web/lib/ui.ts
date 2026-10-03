// Small presentation maps shared by the static pages (same classes as the mockups).
export const FLAGS = { VN: "🇻🇳", MM: "🇲🇲", BD: "🇧🇩", ID: "🇮🇩" } as const;

export const COUNTRY_JA = { VN: "ベトナム", MM: "ミャンマー", BD: "バングラデシュ", ID: "インドネシア" } as const;

export const STATUS_BADGE = {
  draft: "badge",
  available: "badge badge-info badge-dot",
  proposed: "badge badge-success badge-dot",
  interviewing: "badge badge-warning badge-dot",
  selected: "badge badge-dot",
  departed: "badge badge-dot",
  archived: "badge badge-dot",
} as const;

export const LINK_STATUS_BADGE = {
  active: "badge badge-success badge-dot",
  expired: "badge badge-dot",
  revoked: "badge badge-danger badge-dot",
} as const;
