import { screen, within } from "@testing-library/react";
import { fakeWorkspace, renderPage, serveApi } from "@/test/render";
import { deriveKey } from "@/lib/keys";
import { TemplateGallery } from "../templates/TemplateGallery";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
vi.mock("@/lib/workspace", async (orig) => ({
  ...(await orig<typeof import("@/lib/workspace")>()),
  useWorkspace: () => ({ current: fakeWorkspace, list: [fakeWorkspace], isLoading: false, switchTo: vi.fn(), refresh: vi.fn() }),
}));

describe("deriveKey", () => {
  it("turns a policy name into a valid key", () => {
    expect(deriveKey("Checkout Discount!")).toBe("checkout-discount");
    expect(deriveKey("  Über  VIP -- access  ")).toBe("uber-vip-access");
    expect(deriveKey("A")).toBe("");
  });
});

describe("TemplateGallery", () => {
  it("groups templates by category and shows each rule as a sentence", async () => {
    serveApi({
      "/api/templates": [
        { id: "checkout-discount", name: "Checkout discount", category: "Commerce", description: "d", preview: ["When Customer tier is gold → Allow"] },
        { id: "admin-console-access", name: "Admin console access", category: "Access", description: "d", preview: ["When MFA enabled is no → Deny"] },
      ],
    });
    await renderPage(<TemplateGallery />);
    const commerce = await screen.findByRole("region", { name: "Commerce" });
    expect(within(commerce).getByText("Checkout discount")).toBeInTheDocument();
    expect(within(commerce).getByText("When Customer tier is gold, allow")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Access" })).getByText("Admin console access")).toBeInTheDocument();
  });
});
