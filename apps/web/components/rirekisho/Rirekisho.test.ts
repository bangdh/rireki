import { NextIntlClientProvider } from "next-intl";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { stripSections } from "@/lib/shares/format";
import { ageAt, dateJa, Rirekisho } from "./Rirekisho";

test("dateJa prints Japanese dates without zero padding", () => {
  expect(dateJa("2002-03-15")).toBe("2002年3月15日");
  expect(dateJa("2026-10-01")).toBe("2026年10月1日");
});

test("ageAt counts full years (the mockup: born 2002-03-15 is 24 on 2026-09-28)", () => {
  expect(ageAt("2002-03-15", new Date("2026-09-28"))).toBe(24);
  expect(ageAt("2002-03-15", new Date("2026-03-14"))).toBe(23);
  expect(ageAt("2002-03-15", new Date("2026-03-15"))).toBe(24);
});

test("drafts without a date of birth render blanks instead of NaN", () => {
  expect(dateJa("")).toBe("");
  expect(dateJa(undefined)).toBe("");
  expect(ageAt(undefined, new Date("2026-09-28"))).toBeNull();
});

test("family / health hidden by a share link print the note, never 無 or — from the stripped values", () => {
  const render = (props: { hideFamily?: boolean; hideHealth?: boolean }) =>
    renderToStaticMarkup(h(NextIntlClientProvider, { locale: "ja", timeZone: "Asia/Tokyo", children: h(Rirekisho, { cv: { nameKana: "グエン", nameLatin: "NGUYEN VAN AN" }, asOf: new Date("2026-10-01"), ...props }) }));
  const shown = render({});
  expect(shown).toContain("<td>無</td>"); // 配偶者 of a CV without the field
  expect(shown).toContain("身長");
  const hidden = render({ hideFamily: true, hideHealth: true });
  expect(hidden).not.toContain("<td>無</td>");
  expect(hidden).not.toContain("身長");
  expect(hidden.match(/送出機関の設定により非表示</g)?.length).toBe(7); // 家族構成, 配偶者 ×2, 身体情報, 宗教, 食べられないもの, アレルギー
});

test("the print route's hidden variant: no false 無 / — and no 写真 placeholder for a married candidate with an allergy", () => {
  // what /print/candidates/{id}?hide=family,health,photo hands the component (photoUrl is not even fetched)
  const cv = stripSections({ nameLatin: "NGUYEN VAN AN", spouse: true, spouseDependency: true, allergies: "えび" }, { family: false, health: false });
  const html = renderToStaticMarkup(h(NextIntlClientProvider, { locale: "ja", timeZone: "Asia/Tokyo", children: h(Rirekisho, { cv, asOf: new Date("2026-10-01"), hideFamily: true, hideHealth: true, hidePhoto: true }) }));
  const note = '<span class="hidden-note">送出機関の設定により非表示</span>';
  for (const th of ["家族構成", "配偶者", "配偶者の扶養義務", "宗教的に注意が必要な事項", "食べられないもの", "アレルギー"]) expect(html).toContain(`<th>${th}</th><td>${note}</td>`);
  expect(html).not.toMatch(/<td>(無|有)<\/td>/);
  expect(html).not.toContain("えび");
  expect(html).not.toContain("写真");
  expect(html).toContain(`class="photo-cell">${note}</td>`);
  const photo = renderToStaticMarkup(h(NextIntlClientProvider, { locale: "ja", timeZone: "Asia/Tokyo", children: h(Rirekisho, { cv, asOf: new Date("2026-10-01"), photoUrl: "data:image/png;base64,AA" }) }));
  expect(photo).toContain('<img src="data:image/png;base64,AA"');
});
