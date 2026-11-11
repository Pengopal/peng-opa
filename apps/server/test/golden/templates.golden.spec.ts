import { checkInput, describeRule, validateRuleSet } from "@peng/shared";
import { HttpOpaGateway } from "../../src/opa-gateway/http-opa-gateway.js";
import { TEMPLATES } from "../../src/templates/definitions/index.js";
import { startTestOpa, TestOpa } from "../support/stack.js";
import { runGolden } from "./run-golden.js";

/** Small deterministic PRNG so generator checks are repeatable. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("templates", () => {
  let opa: TestOpa;
  let gateway: HttpOpaGateway;

  beforeAll(async () => {
    opa = await startTestOpa();
    gateway = new HttpOpaGateway(() => opa.url, opa.token);
  });
  afterAll(async () => opa?.kill());

  it("has the nine v1 templates across four categories", () => {
    expect(TEMPLATES).toHaveLength(9);
    expect(new Set(TEMPLATES.map((t) => t.category))).toEqual(new Set(["Commerce", "Access", "Finance", "HR"]));
  });

  it.each(TEMPLATES.map((t) => [t.id, t] as const))("%s: valid, samples decide as expected in OPA, generator types are right", async (_id, t) => {
    expect(validateRuleSet(t.ruleSet).filter((i) => i.severity === "error")).toEqual([]);
    expect(t.samples.length).toBeGreaterThanOrEqual(3);
    for (const rule of t.ruleSet.rules) expect(describeRule(rule, t.ruleSet)).not.toBe("");

    const failures = await runGolden(gateway, {
      name: t.id.replace(/-/g, "_"),
      ruleSet: t.ruleSet,
      cases: t.samples.map((s) => ({ input: s.input, expect: s.expect })),
    });
    expect(failures).toEqual([]);

    const rng = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const input = t.generateInput(rng);
      expect(checkInput(t.ruleSet, input)).toEqual({ typeErrors: [], missingFields: [] });
    }
  });
});
