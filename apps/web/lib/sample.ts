// Sample data of the fictional tenant Sao Việt Manpower, copied from the mockups, for the static foundation pages.
// Every feature lane replaces its usage with Prisma queries scoped by tenantId and deletes what it no longer needs.
// TODO(integration): delete this file once no page imports it (only app/(tenant)/candidates/import/[jobId] still does).

export const TENANT = {
  slug: "saoviet",
  name: "Sao Việt Manpower",
  nameJa: "サオベト人材株式会社",
  legalName: "Sao Việt Manpower JSC",
  domain: "saoviet.rireki.app",
  initials: "SV",
  footer: "Sao Việt Manpower JSC · Hà Nội · +84 24 3856 7890 · sales@saoviet.vn",
  contact: { name: "Nguyễn Thị Hương", email: "sales@saoviet.vn", phone: "+84 24 3856 7890" },
  nextCode: "SV000231",
};
