import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fakeWorkspace, renderPage, serveApi } from "@/test/render";
import { Home } from "./Home";
import { Welcome } from "../onboarding/Welcome";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
const switchTo = vi.fn();
vi.mock("@/lib/workspace", async (orig) => ({
  ...(await orig<typeof import("@/lib/workspace")>()),
  useWorkspace: () => ({ current: fakeWorkspace, list: [fakeWorkspace], isLoading: false, switchTo, refresh: vi.fn() }),
}));

const days = Array.from({ length: 14 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, "0")}`, allowed: i, denied: 1 }));
const baseRoutes = { "/api/insights/daily?days=14": days, "/api/insights/recent?limit=5": [], "/api/policies": [{ id: "p1" }] };

describe("Home", () => {
  it("shows — for empty numbers and the setup checklist until all three steps are done", async () => {
    serveApi({
      ...baseRoutes,
      "/api/insights/summary": { decisionsToday: 0, allowRateToday: null, livePolicies: 0, p95LatencyToday: null, firstApiCallAt: null, hasTested: true, hasPublished: false },
    });
    const view = await renderPage(<Home />);
    expect(await screen.findByText("Get set up")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: /Test a policy/ })).toHaveAttribute("data-done", "true");
    expect(screen.getByRole("listitem", { name: /Publish/ })).toHaveAttribute("data-done", "false");
    expect(screen.getAllByText("—")).toHaveLength(2); // allow rate and p95
    view.unmount();

    serveApi({
      ...baseRoutes,
      "/api/insights/summary": { decisionsToday: 12, allowRateToday: 0.75, livePolicies: 2, p95LatencyToday: 6, firstApiCallAt: "2026-11-01T00:00:00Z", hasTested: true, hasPublished: true },
    });
    await renderPage(<Home />);
    expect(await screen.findByText("75%")).toBeInTheDocument();
    expect(screen.queryByText("Get set up")).not.toBeInTheDocument();
  });
});

describe("Welcome", () => {
  it("creates the demo workspace and switches to it", async () => {
    const created = { ...fakeWorkspace, id: "demo-1", isDemo: true, name: "Acme Retail (Demo)" };
    serveApi({ "POST /api/demo": created });
    await renderPage(<Welcome />);
    await userEvent.click(screen.getByRole("button", { name: /Explore the demo/ }));
    await waitFor(() => expect(switchTo).toHaveBeenCalledWith("demo-1"));
  });
});
