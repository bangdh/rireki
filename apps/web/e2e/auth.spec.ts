import { expect, test, type Page } from "@playwright/test";

// Seeded accounts (packages/db/seed.ts): owner = Admin, member = User.
const PASSWORD = "Rireki-demo-2026";
const ADMIN = "huong.nguyen@saoviet.vn";
const USER = "trang.pham@saoviet.vn";

async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle"); // hydrated: the form is handled by the better-auth client
  await page.locator("#email").fill(email);
  await page.locator("#pw").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test("admin signs in and lands on the dashboard", async ({ page }) => {
  await login(page, ADMIN);
  await page.waitForURL("**/dashboard");
  await expect(page.locator(".sidebar .me .name")).toContainText("Nguyễn Thị Hương");
  await expect(page.locator(".kpi").first()).toBeVisible();
});

test("wrong password shows an error and stays on /login", async ({ page }) => {
  await login(page, ADMIN, "not-the-password");
  await expect(page.locator(".callout-danger")).toContainText("Invalid email or password");
  expect(new URL(page.url()).pathname).toBe("/login");
});

test("the user role gets 403 on settings, with the sidebar", async ({ page }) => {
  await login(page, USER);
  await page.waitForURL("**/dashboard");
  const response = await page.goto("/settings/members");
  expect(response?.status()).toBe(403);
  await expect(page.locator(".sidebar")).toBeVisible();
  await expect(page.locator(".callout-danger")).toContainText("Access denied");
});

test("without a session, /dashboard redirects to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForURL("**/login");
  await expect(page.locator("h1")).toContainText("Sign in");
});
