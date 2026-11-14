import { expect, test } from "@playwright/test";
import { publish, signUpWithWorkspace, tryIt, useCheckoutTemplate } from "./helpers";

test("first run: template → test → publish → API key → real decision → checklist done", async ({ page, request }) => {
  await signUpWithWorkspace(page);
  await useCheckoutTemplate(page);

  await tryIt(page, "Gold, $250");
  await expect(page.getByText("Allowed").first()).toBeVisible();
  await expect(page.getByText("Gold customers on bigger orders").last()).toBeVisible();

  await publish(page, 1);

  await page.getByRole("link", { name: "Connect" }).click();
  await page.getByRole("button", { name: "New key" }).click();
  await page.getByLabel("Name").fill("E2E service");
  await page.getByRole("button", { name: "Create key" }).click();
  const key = (await page.getByRole("dialog").locator("code", { hasText: /^pk_live_/ }).textContent())!.trim();
  await page.getByRole("button", { name: "Done" }).click();

  const res = await request.post("/v1/decide/checkout-discount", {
    headers: { Authorization: `Bearer ${key}` },
    data: { input: { customer: { tier: "gold", first_order: false }, order: { total: 250 } } },
  });
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ allowed: true, rule: "Gold customers on bigger orders", outcomes: { discount: 15 }, policy: { version: 1 } });

  // Decisions are written within about a second; the checklist then disappears.
  await expect(async () => {
    await page.goto("/home");
    await expect(page.getByText("Decisions today")).toBeVisible();
    await expect(page.getByText("Get set up")).toHaveCount(0);
  }).toPass({ timeout: 15_000 });
});

test("edit and test: a draft change shows in Try it while live keeps the published rules", async ({ page }) => {
  await signUpWithWorkspace(page);
  await useCheckoutTemplate(page);
  await publish(page, 1);

  // Rule 1: gold customers need at least 300 now (was 200).
  const rule1 = page.getByRole("article", { name: /^Rule 1/ }).or(page.locator('[aria-label^="Rule 1:"]'));
  await rule1.getByRole("spinbutton", { name: "Value" }).fill("300");
  await expect(page.getByText("Saved")).toBeVisible();

  await tryIt(page, "Gold, $250", "Draft");
  await expect(page.getByText("Denied").first()).toBeVisible();

  await tryIt(page, "Gold, $250", /^Live v1$/);
  await expect(page.getByText("Allowed").first()).toBeVisible();
});

test("demo: explore the demo workspace, then reset it", async ({ page }) => {
  await signUpWithWorkspace(page);
  await page.getByRole("button", { name: "Explore the demo workspace" }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 30_000 });
  await expect(page.getByText("Acme Retail (Demo)").first()).toBeVisible();
  const today = page.getByText("Decisions today").locator("xpath=following-sibling::dd[1]");
  await expect(today).not.toHaveText("0");

  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByText("Demo reset to its original state")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("link", { name: "Policies" }).click();
  await expect(page.getByRole("row")).toHaveCount(5); // header + 4 live demo policies
});
