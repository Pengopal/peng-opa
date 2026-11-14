import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { sampleRuleSet, type Condition } from "@peng/shared";
import { api } from "@/lib/api";
import { ConditionRow } from "./ConditionRow";
import { FieldPicker } from "./FieldPicker";
import { useDraft } from "./useDraft";
import { matchedRuleId } from "./matched-rule";
import type { TryResult } from "@/lib/types";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));

describe("ConditionRow", () => {
  it("offers the operators and value input that fit the field's type", async () => {
    const rs = sampleRuleSet();
    rs.fields.push({ path: "account.created", label: "Account created", type: "date" });
    const onChange = vi.fn();
    const { rerender } = render(<ConditionRow ruleSet={rs} condition={{ field: "customer.tier", op: "is", value: "gold" }} onChange={onChange} onRemove={vi.fn()} onCreateField={vi.fn()} />);
    // Text field with options: operator in words, value as a choice.
    expect(screen.getByRole("combobox", { name: "Operator" })).toHaveTextContent("is");
    expect(screen.getByRole("combobox", { name: "Value" })).toHaveTextContent("gold");

    const numberCond: Condition = { field: "order.total", op: "gt", value: 500 };
    rerender(<ConditionRow ruleSet={rs} condition={numberCond} onChange={onChange} onRemove={vi.fn()} onCreateField={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Operator" })).toHaveTextContent("is more than");
    expect(screen.getByRole("spinbutton", { name: "Value" })).toHaveValue(500);

    rerender(<ConditionRow ruleSet={rs} condition={{ field: "account.created", op: "before", value: "2026-01-31" }} onChange={onChange} onRemove={vi.fn()} onCreateField={vi.fn()} />);
    expect(screen.getByLabelText("Value")).toHaveAttribute("type", "date");
  });
});

describe("FieldPicker", () => {
  it("offers to create a field when an unknown valid path is typed", async () => {
    const onCreate = vi.fn();
    render(<FieldPicker fields={sampleRuleSet().fields} value="customer.tier" onSelect={vi.fn()} onCreate={onCreate} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Field" }));
    await userEvent.type(screen.getByPlaceholderText(/Search or type a new field/), "customer.region");
    await userEvent.click(screen.getByRole("option", { name: /Create field “customer.region” as text/ }));
    expect(onCreate).toHaveBeenCalledWith({ path: "customer.region", label: "Customer region", type: "text" });
  });
});

describe("useDraft", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("saves once, 1.5 s after the last change", async () => {
    vi.mocked(api).mockResolvedValue({ issues: [] });
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useDraft("p1", sampleRuleSet()), { wrapper });

    for (const total of [600, 700, 800]) {
      act(() => result.current.setRuleSet((rs) => ({ ...rs, rules: rs.rules.map((r, i) => (i === 0 ? { ...r, conditions: [r.conditions[0], { ...r.conditions[1], value: total }] } : r)) })));
      await act(() => vi.advanceTimersByTimeAsync(500));
    }
    expect(result.current.saveState).toBe("unsaved");
    expect(api).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1_500));
    expect(api).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api).mock.calls[0][1]?.body).toMatchObject({ ruleSet: { rules: [{ conditions: [{}, { value: 800 }] }, {}] } });
    expect(result.current.saveState).toBe("saved");
  });
});

describe("matchedRuleId", () => {
  const base = sampleRuleSet();
  const rs = { ...base, rules: [{ ...base.rules[0], id: "a", label: "Gold" }, { ...base.rules[1], id: "b", label: "Gold" }] };
  const r = (over: Partial<TryResult>) =>
    ({ allowed: true, reason: "", outcomes: {}, rule: "Gold", policy: { key: "k", version: 1 }, decisionId: "d", target: "draft", latencyMs: 1, missingFields: [], typeErrors: [], ...over }) as TryResult;
  it("marks the first rule with that name", () => expect(matchedRuleId(rs, r({}))).toBe("a"));
  it("marks nothing for a live result", () => expect(matchedRuleId(rs, r({ target: "live" }))).toBeNull());
  it("marks nothing when no rule matched", () => expect(matchedRuleId(rs, r({ rule: null }))).toBeNull());
});
