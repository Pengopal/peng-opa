import type { OpaGateway } from "../../src/opa-gateway/opa-gateway";
import { compileRuleSet } from "../../src/rego-compiler/compile";
import type { GoldenFixture } from "./fixtures";

const DAY_MS = 86_400_000;

function resolveDates(value: unknown): unknown {
  if (typeof value === "string") {
    const m = /^\$daysAgo:(\d+)$/.exec(value);
    return m ? new Date(Date.now() - Number(m[1]) * DAY_MS).toISOString() : value;
  }
  if (Array.isArray(value)) return value.map(resolveDates);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveDates(v)]));
  return value;
}

/**
 * Compile a fixture, push it to OPA under package golden.<name>, evaluate every case and
 * return the mismatches (empty = pass). Reused by the template golden tests.
 */
export async function runGolden(gateway: OpaGateway, fixture: GoldenFixture): Promise<string[]> {
  const pkg = `golden.${fixture.name}`;
  await gateway.upsertPolicy(`golden/${fixture.name}`, compileRuleSet(pkg, fixture.ruleSet));
  const failures: string[] = [];
  for (const [i, c] of fixture.cases.entries()) {
    const got = await gateway.evaluate(`golden/${fixture.name}/decision`, resolveDates(c.input));
    const ok =
      got !== undefined &&
      got.allowed === c.expect.allowed &&
      got.rule === c.expect.rule &&
      (c.expect.outcomes === undefined || JSON.stringify(got.outcomes) === JSON.stringify(c.expect.outcomes));
    if (!ok) failures.push(`${fixture.name} case ${i} input=${JSON.stringify(c.input)} expected=${JSON.stringify(c.expect)} got=${JSON.stringify(got)}`);
  }
  return failures;
}
