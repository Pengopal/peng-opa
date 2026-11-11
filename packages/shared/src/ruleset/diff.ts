import type { Result, Rule, RuleChange, RuleSet } from "./types";

const content = (r: Rule) => JSON.stringify({ label: r.label, match: r.match, conditions: r.conditions, result: r.result });
const sameResult = (a: Result, b: Result) => JSON.stringify(a) === JSON.stringify(b);

/** Rule-level changes from `prev` to `next`, in `next` order; removed rules and the otherwise rule come last. */
export function diffRuleSets(prev: RuleSet, next: RuleSet): RuleChange[] {
  const prevById = new Map(prev.rules.map((r) => [r.id, r]));
  const nextIds = new Set(next.rules.map((r) => r.id));
  const commonPrevOrder = prev.rules.filter((r) => nextIds.has(r.id)).map((r) => r.id);
  const commonNextOrder = next.rules.filter((r) => prevById.has(r.id)).map((r) => r.id);

  const changes: RuleChange[] = [];
  for (const rule of next.rules) {
    const before = prevById.get(rule.id);
    if (!before) changes.push({ ruleId: rule.id, label: rule.label, kind: "added" });
    else if (content(before) !== content(rule)) changes.push({ ruleId: rule.id, label: rule.label, kind: "changed" });
    else if (commonPrevOrder.indexOf(rule.id) !== commonNextOrder.indexOf(rule.id)) {
      changes.push({ ruleId: rule.id, label: rule.label, kind: "moved" });
    }
  }
  for (const rule of prev.rules) {
    if (!nextIds.has(rule.id)) changes.push({ ruleId: rule.id, label: rule.label, kind: "removed" });
  }
  if (!sameResult(prev.otherwise, next.otherwise)) changes.push({ ruleId: "otherwise", label: "Otherwise", kind: "changed" });
  return changes;
}
