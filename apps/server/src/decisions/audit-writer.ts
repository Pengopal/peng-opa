import type { DecisionSource } from "../generated/prisma/client.js";

export interface DecisionRecord {
  id: string;
  workspaceId: string;
  policyId: string;
  versionNumber: number | null;
  source: DecisionSource;
  input: unknown;
  result: unknown;
  allowed: boolean;
  matchedRule: string | null;
  missingFields: string[];
  latencyMs: number;
  createdAt: Date;
}

/** Receives every decision for the log and usage rollups; must never block or fail the decision. */
export interface AuditWriter {
  enqueue(record: DecisionRecord): void;
}

export const AUDIT_WRITER = Symbol("AUDIT_WRITER");
