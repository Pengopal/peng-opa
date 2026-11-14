import { render, screen } from "@testing-library/react";
import { DecisionChip } from "./DecisionChip";

describe("DecisionChip", () => {
  it("shows a coloured dot and text, not a filled pill", () => {
    render(
      <>
        <DecisionChip allowed />
        <DecisionChip allowed={false} />
      </>,
    );
    const allowed = screen.getByText("Allowed").closest("[data-decision]")!;
    const denied = screen.getByText("Denied").closest("[data-decision]")!;
    expect(allowed).toHaveAttribute("data-decision", "allow");
    expect(denied).toHaveAttribute("data-decision", "deny");
    expect(denied.className).not.toMatch(/\bbg-/);
    expect(allowed.querySelector("[aria-hidden]")).toHaveClass("bg-success");
    expect(denied.querySelector("[aria-hidden]")).toHaveClass("bg-danger");
  });
});
