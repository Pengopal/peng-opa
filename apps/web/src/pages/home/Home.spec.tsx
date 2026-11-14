import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fakeWorkspace, renderPage, serveApi } from "@/test/render";
import { Home } from "./Home";
import { Welcome } from "../onboarding/Welcome";
import { dayDelta, type DayPoint } from "./insights";

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

describe("dayDelta", () => {
  const d = (allowed: number, denied: number) => ({ date: "x", allowed, denied });
  const total = (p: DayPoint) => p.allowed + p.denied;
  it("compares today with yesterday", () => {
    expect(dayDelta([d(50, 50), d(60, 90)], total)).toEqual({ today: 150, yesterday: 100, pct: 50 });
  });
  it("has no percentage when yesterday was zero", () => {
    expect(dayDelta([d(0, 0), d(3, 1)], total).pct).toBeNull();
  });
});

test("Decisions today shows yesterday's total, not a % change against a partial day", async () => {
  const { render } = await import("@testing-library/react");
  const { StatTiles } = await import("./StatTiles");
  const days: DayPoint[] = [
    { date: "2026-11-13", allowed: 200, denied: 40 },
    { date: "2026-11-14", allowed: 20, denied: 4 },
  ];
  render(<StatTiles summary={{ decisionsToday: 24, allowRateToday: 0.83, livePolicies: 4, p95LatencyToday: 9 } as never} days={days} />);
  expect(screen.getByText("240 yesterday")).toBeInTheDocument();
  expect(screen.queryByText(/% vs yesterday/)).not.toBeInTheDocument();
});
