import { expect, test } from "@playwright/test";
import { publish, signUpWithWorkspace, tryIt, useCheckoutTemplate } from "./helpers";

test("phone: edit a condition and test it", async ({ page }) => {
  await signUpWithWorkspace(page);
  await useCheckoutTemplate(page);
  await publish(page, 1);

  await expect(async () => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);
  }).toPass();

  const rule1 = page.getByRole("article", { name: /^Rule 1/ }).or(page.locator('[aria-label^="Rule 1:"]'));
  await rule1.getByRole("spinbutton", { name: "Value" }).fill("300");
  await expect(page.getByText("Saved")).toBeVisible();

  await page.getByRole("button", { name: "Test" }).click();
  await tryIt(page, "Gold, $250", "Draft");
  await expect(page.getByText("Denied").first()).toBeVisible();
  await page.getByRole("dialog", { name: "Try it" }).getByRole("button", { name: "Close" }).click();

  await page.getByRole("link", { name: "Activity" }).click();
  const firstDecision = page.getByRole("list", { name: "Decisions" }).getByRole("button").first();
  // Decisions are written within about a second.
  await expect(async () => {
    await page.reload();
    await expect(firstDecision).toBeVisible();
  }).toPass({ timeout: 15_000 });
  await expect(firstDecision).toBeInViewport();
  await firstDecision.click();
});
