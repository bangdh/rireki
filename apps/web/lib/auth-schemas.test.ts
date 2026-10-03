import { describe, expect, test } from "vitest";
import { CodeFormatInput, InviteInput, initials, parseEmails, parseOrgMeta, prefixFromSlug, RESERVED_SLUGS, SignupInput, suggestSlug, zodErrorMap } from "./auth-schemas";

describe("suggestSlug", () => {
  test("strips diacritics, company words and separators", () => {
    expect(suggestSlug("Hà Nội Manpower JSC")).toBe("hanoi");
    expect(suggestSlug("Sao Việt Manpower JSC")).toBe("saoviet");
    expect(suggestSlug("Công ty Đông Á Co., Ltd")).toBe("congtydonga");
  });
  test("caps at 24 characters", () => {
    expect(suggestSlug("a".repeat(40))).toHaveLength(24);
  });
});

describe("prefixFromSlug", () => {
  test("first two letters upper-cased, padded with X", () => {
    expect(prefixFromSlug("hanoi")).toBe("HA");
    expect(prefixFromSlug("saoviet")).toBe("SA");
    expect(prefixFromSlug("s3-corp")).toBe("SC");
    expect(prefixFromSlug("a1")).toBe("AX");
    expect(prefixFromSlug("123")).toBe("XX");
  });
});

describe("parseEmails", () => {
  test("splits on newlines, commas and semicolons, lower-cases and de-duplicates", () => {
    expect(parseEmails("a@x.vn, B@x.vn\n a@x.vn;c@x.vn ")).toEqual(["a@x.vn", "b@x.vn", "c@x.vn"]);
    expect(parseEmails("")).toEqual([]);
  });
  test("InviteInput validates each address and the count", () => {
    expect(InviteInput.safeParse({ emails: "a@x.vn\nnot-an-email", role: "member", lang: "vi" }).success).toBe(false);
    expect(InviteInput.safeParse({ emails: "", role: "member", lang: "vi" }).success).toBe(false);
    const ok = InviteInput.safeParse({ emails: "a@x.vn, b@x.vn", role: "admin", lang: "ja", branch: " Yangon " });
    expect(ok.success && ok.data).toEqual({ emails: ["a@x.vn", "b@x.vn"], role: "admin", lang: "ja", branch: "Yangon" });
    const blank = InviteInput.safeParse({ emails: "a@x.vn", role: "member", lang: "vi", branch: "" });
    expect(blank.success && blank.data.branch).toBeUndefined();
  });
});

describe("zodErrorMap", () => {
  test("issues come in the UI language, English for Burmese", () => {
    const bad = { emails: "not-an-email", role: "member", lang: "vi" };
    expect(InviteInput.safeParse(bad, zodErrorMap("ja")).error?.issues[0]?.message).toBe("無効なメールアドレス");
    expect(InviteInput.safeParse(bad, zodErrorMap("vi")).error?.issues[0]?.message).toMatch(/email/i);
    expect(InviteInput.safeParse(bad, zodErrorMap("my")).error?.issues[0]?.message).toBe("Invalid email address");
  });
});

describe("initials", () => {
  test("first and last word", () => {
    expect(initials("Nguyễn Thị Hương")).toBe("NH");
    expect(initials("Aung Myat")).toBe("AM");
    expect(initials("Đỗ Thị Lan")).toBe("ĐL");
    expect(initials("Rireki")).toBe("RI");
    expect(initials("  ")).toBe("?");
  });
});

describe("schemas", () => {
  test("SignupInput rejects malformed slugs; reserved ones are refused by the action", () => {
    const base = { company: "X", country: "VN", lang: "vi", name: "A", email: "A@x.vn", password: "0123456789", agree: "on" };
    expect(SignupInput.safeParse({ ...base, slug: "Ab" }).success).toBe(false);
    expect(SignupInput.safeParse({ ...base, slug: "a b" }).success).toBe(false);
    expect(RESERVED_SLUGS).toContain("www");
    const ok = SignupInput.safeParse({ ...base, slug: "hanoi" });
    expect(ok.success && ok.data.email).toBe("a@x.vn");
  });
  test("CodeFormatInput upper-cases the prefix and coerces the number", () => {
    const ok = CodeFormatInput.safeParse({ prefix: "sv", nextCode: "000231" });
    expect(ok.success && ok.data).toEqual({ prefix: "SV", nextCode: 231 });
    expect(CodeFormatInput.safeParse({ prefix: "s1", nextCode: "1" }).success).toBe(false);
  });
  test("parseOrgMeta tolerates null and garbage", () => {
    expect(parseOrgMeta(null)).toEqual({ poweredBy: true, timezone: "Asia/Ho_Chi_Minh" });
    expect(parseOrgMeta("{not json")).toEqual({ poweredBy: true, timezone: "Asia/Ho_Chi_Minh" });
    expect(parseOrgMeta('{"phone":"+84","poweredBy":false,"timezone":"Asia/Yangon"}')).toEqual({ phone: "+84", poweredBy: false, timezone: "Asia/Yangon" });
  });
});
