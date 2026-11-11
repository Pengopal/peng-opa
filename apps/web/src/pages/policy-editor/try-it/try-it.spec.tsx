import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { sampleRuleSet, validateRuleSet } from "@peng/shared";
import { api } from "@/lib/api";
import { renderPage, serveApi } from "@/test/render";
import { buildInput, flattenInput } from "./input";
import { TryItPanel } from "./TryItPanel";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));

describe("buildInput / flattenInput", () => {
  it("turns field paths into nested input, typed by field, skipping blanks — and back", () => {
    const fields = [
      ...sampleRuleSet().fields,
      { path: "customer.flags", label: "Flags", type: "list" as const },
      { path: "customer.vip", label: "VIP", type: "yesno" as const },
    ];
    const input = buildInput(fields, { "customer.tier": "gold", "order.total": "620", "customer.flags": "a, b", "customer.vip": "true" });
    expect(input).toEqual({ customer: { tier: "gold", flags: ["a", "b"], vip: true }, order: { total: 620 } });
    expect(buildInput(fields, { "customer.tier": "", "order.total": "" })).toEqual({});
    expect(flattenInput(fields, input)).toMatchObject({ "customer.tier": "gold", "order.total": "620", "customer.flags": "a, b", "customer.vip": "true" });
  });
});

describe("TryItPanel", () => {
  const panel = (rs = sampleRuleSet()) => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      policy: { id: "p1", key: "checkout-discount", status: "LIVE", liveVersion: { number: 1, publishedAt: "" } } as never,
      draft: { ruleSet: rs, issues: validateRuleSet(rs), flush } as never,
      canEdit: true,
    };
    return { ctx, flush };
  };

  it("runs the draft and shows the decision, the matching rule and missing fields", async () => {
    serveApi({
      "/api/policies/p1/samples": [],
      "POST /api/policies/p1/try": { allowed: true, reason: "Gold loyalty", outcomes: { discount: 15 }, rule: "Gold customers", policy: { key: "k", version: null }, decisionId: "d", target: "draft", latencyMs: 4, missingFields: ["order.total"], typeErrors: [] },
    });
    const { ctx, flush } = panel();
    await renderPage(<TryItPanel {...ctx} />);
    await userEvent.click(await screen.findByRole("combobox", { name: "Customer tier" }));
    await userEvent.click(await screen.findByRole("option", { name: "gold" }));
    await userEvent.click(screen.getByRole("button", { name: /Run/ }));

    expect(await screen.findByText("Allowed")).toBeInTheDocument();
    expect(screen.getByText("Gold customers")).toBeInTheDocument();
    expect(screen.getByText(/Not sent: order\.total/)).toBeInTheDocument();
    expect(flush).toHaveBeenCalled();
    expect(vi.mocked(api).mock.calls.find(([p]) => p === "/api/policies/p1/try")?.[1]?.body).toEqual({ input: { customer: { tier: "gold" } }, target: "draft" });
  });

  it("asks to fix issues before testing a draft that has errors", async () => {
    serveApi({ "/api/policies/p1/samples": [] });
    const rs = sampleRuleSet();
    rs.rules[0].conditions[0].value = "";
    rs.fields[0].options = undefined;
    const { ctx } = panel(rs);
    await renderPage(<TryItPanel {...ctx} />);
    expect(await screen.findByText(/Fix 1 issue before testing the draft/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run/ })).toBeDisabled();
  });
});
