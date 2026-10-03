import { EmailDomain } from "@rireki/shared";
import { expect, test } from "vitest";
import { z } from "zod";
import { errorMap } from "./errorMap";

// A translator that prints the key and its values, e.g. form.err_min{"min":8}.
const t = ((key: string, values?: object) => key + (values ? JSON.stringify(values) : "")) as unknown as Parameters<typeof errorMap>[0];
const messages = (schema: z.ZodType, data: unknown) => schema.safeParse(data, { error: errorMap(t) }).error?.issues.map((i) => `${i.path.join(".")}: ${i.message}`);

test("errorMap turns zod issues into the form.err_* strings (no developer wording, Burmese included)", () => {
  const S = z.object({ name: z.string().trim().min(1).max(5), pw: z.string().min(8).optional(), email: z.email(), domains: z.array(EmailDomain), n: z.coerce.number().int().positive(), lang: z.enum(["ja", "en"]) });
  expect(messages(S, { name: "", pw: "short", email: "x", domains: ["not a domain"], n: "-1", lang: "fr" })).toEqual([
    "name: form.err_required",
    'pw: form.err_min{"min":8}',
    "email: form.err_email",
    "domains.0: form.err_domain", // EmailDomain carries no message of its own, so the map localizes it
    "n: form.err_invalid",
    "lang: form.err_invalid",
  ]);
  expect(messages(S, { name: "toolong", email: "a@client.co.jp", domains: ["@Client.co.jp"], n: "2", lang: "ja" })).toEqual(['name: form.err_max{"max":5}']);
  // a missing field is "required" whatever its type (the candidates form turns blanks into undefined)
  expect(messages(z.object({ gender: z.enum(["male", "female"]), nameKana: z.string().min(1) }), {})).toEqual(["gender: form.err_required", "nameKana: form.err_required"]);
});
