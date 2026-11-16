import { fireEvent, render, screen } from "@testing-library/react";
import { GoogleLogo, ProviderButton, TenantryLogo } from "./ProviderButton";

describe("ProviderButton", () => {
  it("is a full-width button named by its label, with the provider's logo hidden from screen readers", () => {
    const onClick = vi.fn();
    render(<ProviderButton logo={<GoogleLogo />} label="Continue with Google" onClick={onClick} />);
    const button = screen.getByRole("button", { name: "Continue with Google" });
    expect(button).toHaveClass("w-full");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("draws Google's four-colour G", () => {
    const { container } = render(<GoogleLogo />);
    const fills = [...container.querySelectorAll("path")].map((p) => p.getAttribute("fill"));
    expect(fills).toEqual(["#4285F4", "#34A853", "#FBBC05", "#EA4335"]);
  });

  it("shows Tenantry's mark, swapping it for the dark one on a dark page", () => {
    const { container } = render(<TenantryLogo />);
    const [light, dark] = [...container.querySelectorAll("img")];
    expect(light).toHaveAttribute("src", "/brand/tenantry-mark.svg");
    expect(light).toHaveClass("dark:hidden");
    expect(dark).toHaveAttribute("src", "/brand/tenantry-mark-dark.svg");
    expect(dark).toHaveClass("hidden", "dark:block");
    for (const img of [light, dark]) expect(img).toHaveAttribute("alt", "");
  });
});
