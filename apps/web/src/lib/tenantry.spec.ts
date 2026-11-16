import { isTenantryLanding, withoutTenantryLanding, withTenantryLanding } from "./tenantry";

describe("Tenantry landing", () => {
  it("marks the page a Tenantry sign-in returns to", () => {
    expect(withTenantryLanding("/home")).toBe("/home?via=tenantry");
    expect(withTenantryLanding("/policies?tab=live")).toBe("/policies?tab=live&via=tenantry");
  });

  it("recognises the mark and removes it", () => {
    expect(isTenantryLanding("?via=tenantry")).toBe(true);
    expect(isTenantryLanding("?tab=live")).toBe(false);
    expect(withoutTenantryLanding("/policies?tab=live&via=tenantry")).toBe("/policies?tab=live");
    expect(withoutTenantryLanding("/home?via=tenantry")).toBe("/home");
  });
});
