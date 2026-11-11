import { buildSamples } from "./code-samples";

describe("buildSamples", () => {
  it("fills in the endpoint, policy key and input in every language, with a placeholder key", () => {
    const input = { customer: { tier: "gold" }, order: { total: 250 } };
    const samples = buildSamples({ baseUrl: "https://opa.example.com", policyKey: "checkout-discount", input });
    expect(Object.keys(samples)).toEqual(["curl", "javascript", "python", "csharp"]);
    for (const code of Object.values(samples)) {
      expect(code).toContain("https://opa.example.com/v1/decide/checkout-discount");
      expect(code).toContain("YOUR_API_KEY");
      expect(code).toContain('"tier": "gold"');
      expect(code).not.toMatch(/pk_live_[A-Za-z0-9]{32}/);
    }
  });
});
