// Generates messages/{locale}.json from the mockup strings in assets/i18n.js (flat "a.b" keys → nested objects).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const source = readFileSync(new URL("../../../assets/i18n.js", import.meta.url), "utf8");
const all = JSON.parse(source.slice(source.indexOf("{"), source.lastIndexOf("}") + 1));
const outDir = new URL("../messages/", import.meta.url);
mkdirSync(outDir, { recursive: true });

for (const [locale, flat] of Object.entries(all)) {
  const nested = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let node = nested;
    for (const part of parts.slice(0, -1)) node = node[part] ??= {};
    node[parts.at(-1)] = value;
  }
  writeFileSync(new URL(`${locale}.json`, outDir), JSON.stringify(nested, null, 2) + "\n");
}
