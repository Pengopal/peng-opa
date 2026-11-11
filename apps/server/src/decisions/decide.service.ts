import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { checkInput, type RuleSet } from "@peng/shared";
import type { DecisionSource } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { runWithWorkspace } from "../prisma/request-context.js";
import { OPA_GATEWAY, OpaGateway } from "../opa-gateway/opa-gateway.js";
import { OpaUnavailableError } from "../opa-gateway/errors.js";
import { OpaSyncService } from "../opa-gateway/opa-sync.service.js";
import { opaNames } from "../rego-compiler/naming.js";
import { AUDIT_WRITER, AuditWriter } from "./audit-writer.js";
import { PublicApiError } from "./public-error.js";

export interface DecideResponse {
  allowed: boolean;
  reason: string;
  outcomes: Record<string, unknown>;
  /** Label of the matching rule, or null when the "otherwise" result applied. */
  rule: string | null;
  policy: { key: string; version: number };
  decisionId: string;
}

export interface DecideTarget {
  workspaceId: string;
  workspaceShortId: string;
}

interface LivePolicy {
  id: string;
  key: string;
  versionNumber: number;
  ruleSet: RuleSet;
}

const ENGINE_DOWN = "The policy engine is temporarily unavailable. Retry shortly.";

/** Evaluates live policies for the public API (and demo traffic). Records every decision. */
@Injectable()
export class DecideService {
  /** Versions are immutable, so their rule sets can be cached by version id. */
  private readonly ruleSets = new Map<string, RuleSet>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: OpaSyncService,
    @Inject(OPA_GATEWAY) private readonly opa: OpaGateway,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  /** Load the live policy or throw the public 404/409. */
  async livePolicy(target: DecideTarget, policyKey: string): Promise<LivePolicy> {
    return runWithWorkspace(target.workspaceId, async () => {
      const p = await this.prisma.scoped.policy.findUnique({ where: { workspaceId_key: { workspaceId: target.workspaceId, key: policyKey } } });
      if (!p) throw new PublicApiError("policy_not_found", `No policy with key "${policyKey}" in this workspace`);
      if (p.status !== "LIVE" || !p.liveVersionId) {
        throw new PublicApiError("policy_not_live", `Policy "${policyKey}" is ${p.status === "PAUSED" ? "paused" : "not published yet"}`);
      }
      let ruleSet = this.ruleSets.get(p.liveVersionId);
      const v = await this.prisma.scoped.policyVersion.findUnique({ where: { id: p.liveVersionId }, select: { number: true, ruleSet: !ruleSet } });
      if (!v) throw new PublicApiError("policy_not_live", `Policy "${policyKey}" is not published yet`);
      if (!ruleSet) {
        ruleSet = v.ruleSet as unknown as RuleSet;
        if (this.ruleSets.size > 500) this.ruleSets.clear();
        this.ruleSets.set(p.liveVersionId, ruleSet);
      }
      return { id: p.id, key: p.key, versionNumber: v.number, ruleSet };
    });
  }

  /** Throws 422 invalid_input when a present field has the wrong type; returns the missing fields. */
  checkInput(policy: LivePolicy, input: unknown): string[] {
    const { typeErrors, missingFields } = checkInput(policy.ruleSet, input);
    if (typeErrors.length) {
      const list = typeErrors.map((e) => (e.field ? `${e.field} must be ${e.expected}` : "input must be an object")).join("; ");
      throw new PublicApiError("invalid_input", `Input has the wrong type: ${list}`, typeErrors);
    }
    return missingFields;
  }

  /** Evaluate one input against an already-loaded live policy and record it. */
  async evaluate(target: DecideTarget, policy: LivePolicy, input: unknown, missingFields: string[], source: DecisionSource): Promise<DecideResponse> {
    const started = performance.now();
    let decision;
    try {
      decision = await this.opa.evaluate(opaNames(target.workspaceShortId, policy.key).dataPath, input);
    } catch (e) {
      if (e instanceof OpaUnavailableError) throw new PublicApiError("engine_unavailable", ENGINE_DOWN);
      throw e;
    }
    if (!decision) {
      // Live in the database but not loaded in OPA (e.g. OPA just restarted): repair and ask to retry.
      void this.sync.syncAll().catch(() => undefined);
      throw new PublicApiError("engine_unavailable", ENGINE_DOWN);
    }
    const latencyMs = Math.round(performance.now() - started);
    const ruleLabel = decision.rule ? (policy.ruleSet.rules.find((r) => r.id === decision.rule)?.label ?? decision.rule) : null;
    const response: DecideResponse = {
      allowed: decision.allowed,
      reason: decision.reason,
      outcomes: decision.outcomes,
      rule: ruleLabel,
      policy: { key: policy.key, version: policy.versionNumber },
      decisionId: `dec_${randomUUID().replace(/-/g, "")}`,
    };
    this.audit.enqueue({
      id: response.decisionId,
      workspaceId: target.workspaceId,
      policyId: policy.id,
      versionNumber: policy.versionNumber,
      source,
      input,
      result: response,
      allowed: response.allowed,
      matchedRule: ruleLabel,
      missingFields,
      latencyMs,
      createdAt: new Date(),
    });
    return response;
  }

  /** Full path for one input: load, check, evaluate, record. */
  async decide(target: DecideTarget, policyKey: string, input: unknown, source: DecisionSource): Promise<DecideResponse> {
    const policy = await this.livePolicy(target, policyKey);
    const missing = this.checkInput(policy, input);
    return this.evaluate(target, policy, input, missing, source);
  }
}
