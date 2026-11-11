import type { Condition, Field, Outcome, Result, Rule, RuleSet } from "@peng/shared";

export interface TemplateSample {
  name: string;
  input: unknown;
  /** Expected decision; `rule` is the matching rule id or null for "otherwise". */
  expect: { allowed: boolean; rule: string | null };
}

export interface Template {
  /** Also the suggested policy key. */
  id: string;
  name: string;
  category: "Commerce" | "Access" | "Finance" | "HR";
  description: string;
  ruleSet: RuleSet;
  samples: TemplateSample[];
  /** Random but correctly typed input, used for demo traffic. */
  generateInput(rng: () => number): unknown;
}

export type Rng = () => number;
export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];
export const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
export const chance = (rng: Rng, p: number) => rng() < p;

/** Compact rule-set builder for template definitions. */
export function ruleSet(fields: Field[], outcomes: Outcome[], rules: Rule[], otherwise: Result): RuleSet {
  return { schemaVersion: 1, fields, outcomes, rules, otherwise };
}

export function rule(id: string, label: string, match: "all" | "any", conditions: Condition[], result: Result): Rule {
  return { id, label, match, conditions, result };
}

export const allow = (reason: string, outcomes: Result["outcomes"] = {}): Result => ({ allowed: true, reason, outcomes });
export const deny = (reason: string, outcomes: Result["outcomes"] = {}): Result => ({ allowed: false, reason, outcomes });
