import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { fakeWorkspace, renderPage, serveApi } from "@/test/render";
import { decisionsQueryString, parseFilters } from "./filters";
import { DecisionDetailSheet } from "./DecisionDetailSheet";
import { rangeFor } from "./date-range";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
vi.mock("@/lib/workspace", async (orig) => ({
  ...(await orig<typeof import("@/lib/workspace")>()),
  useWorkspace: () => ({ current: fakeWorkspace, list: [fakeWorkspace], isLoading: false, switchTo: vi.fn(), refresh: vi.fn() }),
}));

describe("decision filters", () => {
  it("turn into the API query, leaving out empty ones", () => {
    expect(decisionsQueryString({ policyId: "p1", allowed: "false", source: "API" }, "c9")).toBe("policyId=p1&allowed=false&source=API&cursor=c9");
    expect(decisionsQueryString({ from: "2026-11-01", to: "2026-11-05" })).toBe("from=2026-11-01T00%3A00%3A00.000Z&to=2026-11-05T23%3A59%3A59.999Z");
    expect(decisionsQueryString({})).toBe("");
  });

  it("reads ?allowed=false from the URL, which the router hands over as a boolean", () => {
    expect(parseFilters({ allowed: false, source: "API" })).toMatchObject({ allowed: "false", source: "API" });
    expect(parseFilters({ allowed: true })).toMatchObject({ allowed: "true" });
  });
});

describe("DecisionDetailSheet", () => {
  it("shows the input and result and links to replay it in the policy's playground", async () => {
    serveApi({
      "/api/decisions/d1": {
        id: "d1",
        policyId: "p1",
        policyKey: "checkout-discount",
        policyName: "Checkout discount",
        versionNumber: 3,
        source: "API",
        allowed: false,
        matchedRule: null,
        missingFields: ["order.total"],
        latencyMs: 4,
        createdAt: "2026-11-11T10:00:00Z",
        input: { customer: { tier: "bronze" } },
        result: { allowed: false, reason: "No discount applies", outcomes: {}, rule: null, policy: { key: "checkout-discount", version: 3 }, decisionId: "d1" },
      },
    });
    const { router } = await renderPage(<DecisionDetailSheet decisionId="d1" onClose={vi.fn()} />);
    expect(await screen.findByText("No discount applies")).toBeInTheDocument();
    expect(screen.getByText(/"tier": "bronze"/)).toBeInTheDocument();
    expect(screen.getByText(/order\.total/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: /Replay in playground/ }));
    await waitFor(() => expect(router.state.location.href).toBe("/policies/p1?replay=d1"));
    expect(vi.mocked(api)).toHaveBeenCalledWith("/api/decisions/d1");
  });
});

describe("rangeFor", () => {
  it("starts 'today' at local midnight", () => {
    const now = new Date(2026, 10, 14, 23, 59);
    expect(new Date(rangeFor("today", now).from!).getTime()).toBe(new Date(2026, 10, 14, 0, 0).getTime());
    expect(new Date(rangeFor("7d", now).from!).getTime()).toBe(new Date(2026, 10, 8, 0, 0).getTime());
    expect(rangeFor("all", now)).toEqual({});
  });
});
