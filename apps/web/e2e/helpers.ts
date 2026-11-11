import { expect, type Page } from "@playwright/test";

/** A brand-new user with a workspace, ending on the Welcome screen. */
export async function signUpWithWorkspace(page: Page, workspace = "E2E Shop") {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@peng-opa.test`;
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("E2E Tester");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Workspace name").fill(workspace);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  return { email };
}

/** From the Welcome screen: create a draft from the Checkout discount template and open it. */
export async function useCheckoutTemplate(page: Page) {
  await page.getByRole("link", { name: "Browse templates" }).click();
  await page.getByRole("region", { name: "Commerce" }).getByRole("button", { name: "Use template" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Checkout discount" })).toBeVisible();
}

/** Load a saved sample in Try it and run it against the chosen target. */
export async function tryIt(page: Page, sample: string, target: "Draft" | RegExp = "Draft") {
  await page.getByRole("radio", { name: target }).click();
  await page.getByRole("button", { name: "Samples" }).click();
  await page.getByRole("menuitem", { name: sample }).click();
  await page.getByRole("button", { name: "Run" }).click();
}

export async function publish(page: Page, version: number) {
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("button", { name: `Publish v${version}` }).click();
  await expect(page.getByText(`Live v${version}`).first()).toBeVisible();
}
