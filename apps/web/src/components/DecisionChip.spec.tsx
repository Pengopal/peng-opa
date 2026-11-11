import { render, screen } from "@testing-library/react";
import { DecisionChip } from "./DecisionChip";

describe("DecisionChip", () => {
  it("shows Allowed in the success colours and Denied in the danger colours", () => {
    render(
      <>
        <DecisionChip allowed />
        <DecisionChip allowed={false} />
      </>,
    );
    const allowed = screen.getByText("Allowed").closest("[data-slot=decision-chip]")!;
    const denied = screen.getByText("Denied").closest("[data-slot=decision-chip]")!;
    expect(allowed.className).toMatch(/text-success/);
    expect(denied.className).toMatch(/text-danger/);
    expect(allowed.textContent).toContain("✅");
    expect(denied.textContent).toContain("⛔");
  });
});
