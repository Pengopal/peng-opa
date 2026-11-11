import type { Issue, RuleSet, RuleChange } from "@peng/shared";

export type Role = "OWNER" | "EDITOR" | "VIEWER";
export type PolicyStatus = "DRAFT" | "LIVE" | "PAUSED";
export type DecisionSource = "API" | "PLAYGROUND" | "DEMO";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  shortId: string;
  isDemo: boolean;
  role: Role;
}

export interface PolicySummary {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: PolicyStatus;
  liveVersion: { number: number; publishedAt: string } | null;
  hasDraftChanges: boolean;
  decisions7d: number;
  updatedAt: string;
}

export interface PolicyDetail extends Omit<PolicySummary, "decisions7d"> {
  shortId: string;
  draft: RuleSet;
  issues: Issue[];
}

export interface DecisionResult {
  allowed: boolean;
  reason: string;
  outcomes: Record<string, unknown>;
  rule: string | null;
  policy: { key: string; version: number | null };
  decisionId: string;
}

export interface TryResult extends DecisionResult {
  target: "draft" | "live";
  latencyMs: number;
  missingFields: string[];
  typeErrors: { field: string; expected: string }[];
}

export interface DecisionRow {
  id: string;
  policyId: string;
  policyKey: string | null;
  policyName: string;
  versionNumber: number | null;
  source: DecisionSource;
  allowed: boolean;
  matchedRule: string | null;
  missingFields: string[];
  latencyMs: number;
  createdAt: string;
}

export interface DecisionDetail extends DecisionRow {
  input: unknown;
  result: DecisionResult;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface VersionSummary {
  number: number;
  note: string | null;
  publishedAt: string;
  publishedBy: string | null;
}

export interface PublishPreview {
  issues: Issue[];
  changes: RuleChange[];
}

export interface Sample {
  id: string;
  name: string;
  input: unknown;
}

export interface TemplateSummary {
  id: string;
  name: string;
  category: "Commerce" | "Access" | "Finance" | "HR";
  description: string;
  preview: string[];
}
