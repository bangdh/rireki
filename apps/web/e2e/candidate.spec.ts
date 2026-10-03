import my from "@rireki/shared/messages/my";
import { expect, request, test, type APIRequestContext } from "@playwright/test";

// Flow 2 of run-and-verify: login → 7-step form → detail shows the code and the Japanese 履歴書 → labels in Burmese.
const PASSWORD = "Rireki-demo-2026";
const ADMIN = "huong.nguyen@saoviet.vn";
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://saoviet.localhost:3000";

// One API sign-in per file, shared by every test: better-auth limits /sign-in/email to 5 attempts per 15 minutes.
let state: Awaited<ReturnType<APIRequestContext["storageState"]>>;
test.beforeAll(async () => {
  const api = await request.newContext({ baseURL: BASE });
  const res = await api.post("/api/auth/sign-in/email", { data: { email: ADMIN, password: PASSWORD }, headers: { origin: BASE } });
  expect(res.ok(), await res.text()).toBeTruthy();
  state = await api.storageState();
  await api.dispose();
});
test.use({ storageState: async ({}, provide) => provide(state) });

test("new candidate via the form gets a code and a Japanese 履歴書; the form speaks Burmese", async ({ page }) => {
  test.setTimeout(90_000); // many first-time page compiles on a dev server
  await page.goto("/candidates/new/form");
  await expect(page.locator(".page-header .mono")).toHaveText(/^SV\d{6}$/);

  // step 1 — the first autosave creates the draft and moves the URL to its edit page
  await page.locator("#nationality").selectOption("VN");
  await page.locator("#nameKana").fill("テスト・タロウ");
  await page.locator("#nameLatin").fill("TEST TARO");
  await page.locator("#dob").fill("2001-05-02");
  await page.locator("input[name=gender][value=male]").check();
  await page.waitForURL(/\/candidates\/[a-z0-9]+\/edit$/);
  await expect(page.locator(".page-header .sub .badge")).toContainText("Draft");

  // step 2 — required contact fields, the rest stays optional
  await page.getByRole("button", { name: /^next$/i }).click();
  await page.locator("#mobile").fill("+84 900 000 000");
  await page.locator("#address").fill("Hà Nội, Việt Nam");

  // step 7 — review and create
  await page.locator(".stepper .step").nth(6).click();
  await expect(page.locator(".callout-warning")).toContainText("%");
  await page.locator("input[name=confirm]").check();
  await page.getByRole("button", { name: /create candidate/i }).click();
  await page.waitForURL(/\/candidates\/[a-z0-9]+$/);

  await expect(page.locator(".page-header .badge.mono")).toHaveText(/^SV\d{6}$/);
  await expect(page.locator(".page-header")).toContainText("Available");
  await expect(page.locator("article.rirekisho h2")).toHaveText("履歴書");
  await expect(page.locator("article.rirekisho")).toContainText("テスト・タロウ");
  await expect(page.locator("article.rirekisho")).toContainText("TEST TARO");

  // Burmese UI: form labels switch, the 履歴書 stays Japanese
  await page.locator(".lang-select").selectOption("my");
  await expect(page.locator("article.rirekisho h2")).toHaveText("履歴書");
  await page.goto(`${page.url()}/edit`);
  await expect(page.locator(".stepper .step").first()).toContainText(my.form.s1);
  await expect(page.locator("label[for=nameKana]")).toContainText(my.form.name_kana);
});

test("the list filters by code and the detail is tenant-scoped", async ({ page }) => {
  await page.goto("/candidates?q=SV000182");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr .mono")).toHaveText("SV000182");
  const missing = await page.goto("/candidates/not-a-candidate-of-this-tenant");
  expect(missing?.status()).toBe(404);
});
