import type { RuleSet } from "@peng/shared";
import type { TryResult } from "@/lib/types";

/** The rule a draft Try-it run matched: the first rule with that name. A live run tests another version, so it marks nothing. */
export function matchedRuleId(ruleSet: RuleSet, result: TryResult | null): string | null {
  if (!result || result.target !== "draft" || result.rule === null) return null;
  return ruleSet.rules.find((r) => r.label === result.rule)?.id ?? null;
}
