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
    // A shape cue besides colour: check-circle vs x-circle icons.
    expect(allowed.querySelector("svg.lucide-circle-check")).not.toBeNull();
    expect(denied.querySelector("svg.lucide-circle-x")).not.toBeNull();
  });
});
