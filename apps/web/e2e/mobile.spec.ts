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

  // Touch targets: small buttons are at least 44px tall, and a sentence token still takes a tap 18px below its centre.
  expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
  const del = await rule1.getByRole("button", { name: "Delete rule 1" }).boundingBox();
  expect(del!.height).toBeGreaterThanOrEqual(44);
  const remove = await rule1.getByRole("button", { name: "Remove condition" }).first().boundingBox();
  expect(remove!.height).toBeGreaterThanOrEqual(44);
  const token = rule1.getByRole("combobox", { name: "Match" });
  const box = (await token.boundingBox())!;
  expect(await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('[aria-label="Match"]'), [box.x + box.width / 2, box.y + box.height / 2 + 18])).toBe(true);
  await rule1.getByRole("spinbutton", { name: "Value" }).fill("300");
  await expect(page.getByText("Saved")).toBeVisible();
  // Editing a condition inline must not widen the page past the phone screen.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await page.getByRole("button", { name: "Try it", exact: true }).click();
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
