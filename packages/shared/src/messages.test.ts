import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { LOCALES } from "./constants";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tree).flatMap(([key, value]) =>
      typeof value === "string"
        ? [[prefix + key, value]]
        : Object.entries(flatten(value, `${prefix}${key}.`)),
    ),
  );
}

const messages = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    flatten(JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"))),
  ]),
);
const enKeys = Object.keys(messages.en).sort();

test("en has the mockup strings", () => {
  expect(enKeys.length).toBeGreaterThan(600);
});

test.each(LOCALES)("%s has the same keys as en and no empty strings", (locale) => {
  expect(Object.keys(messages[locale]).sort()).toEqual(enKeys);
  for (const [key, value] of Object.entries(messages[locale])) {
    expect(value, key).not.toBe("");
  }
});
