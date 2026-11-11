import { Inject, Injectable, ServiceUnavailableException, UnprocessableEntityException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { checkInput, validateRuleSet, type RuleSet } from "@peng/shared";
import { OPA_GATEWAY, OpaGateway } from "../opa-gateway/opa-gateway.js";
import { OpaUnavailableError } from "../opa-gateway/errors.js";
import { OpaSyncService } from "../opa-gateway/opa-sync.service.js";
import { compileRuleSet } from "../rego-compiler/compile.js";
import { draftNames } from "../rego-compiler/naming.js";
import { PoliciesService, WorkspaceRef } from "../policies/policies.service.js";
import { regoHash } from "../policies/publishing.service.js";
import { AUDIT_WRITER, AuditWriter } from "./audit-writer.js";
import { DecideService } from "./decide.service.js";

const ENGINE_DOWN = "The policy engine is unavailable right now. Try again in a moment.";

/** Try-it panel: evaluate the unpublished draft (under a throwaway OPA path) or the live version. */
@Injectable()
export class PlaygroundService {
  /** Hash of the Rego last pushed for each draft path, to skip identical re-pushes. */
  private readonly pushedDrafts = new Map<string, string>();

  constructor(
    private readonly policies: PoliciesService,
    private readonly decide: DecideService,
    private readonly sync: OpaSyncService,
    @Inject(OPA_GATEWAY) private readonly opa: OpaGateway,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async try(ref: WorkspaceRef, policyId: string, input: unknown, target: "draft" | "live") {
    const p = await this.policies.find(policyId);
    const target_ = { workspaceId: ref.workspaceId, workspaceShortId: ref.workspaceShortId };

    if (target === "live") {
      const live = await this.decide.livePolicy(target_, p.key);
      const { typeErrors, missingFields } = checkInput(live.ruleSet, input);
      const started = performance.now();
      const res = await this.decide.evaluate(target_, live, input, missingFields, "PLAYGROUND");
      return { ...res, target, latencyMs: Math.round(performance.now() - started), missingFields, typeErrors };
    }

    const ruleSet = p.draft as unknown as RuleSet;
    const issues = validateRuleSet(ruleSet).filter((i) => i.severity === "error");
    if (issues.length) throw new UnprocessableEntityException({ message: `Fix ${issues.length} issue(s) before testing`, issues });
    const names = draftNames(ref.workspaceShortId, p.shortId);
    const { typeErrors, missingFields } = checkInput(ruleSet, input);
    const started = performance.now();
    let decision;
    try {
      const rego = compileRuleSet(names.packageName, ruleSet);
      this.sync.markDraftUsed(names.policyId);
      if (this.pushedDrafts.get(names.policyId) !== regoHash(rego)) {
        await this.opa.upsertPolicy(names.policyId, rego);
        this.pushedDrafts.set(names.policyId, regoHash(rego));
      }
      decision = await this.opa.evaluate(names.dataPath, input);
      if (!decision) {
        // Swept or OPA restarted since the last push: push again once.
        this.pushedDrafts.delete(names.policyId);
        await this.opa.upsertPolicy(names.policyId, rego);
        this.pushedDrafts.set(names.policyId, regoHash(rego));
        decision = await this.opa.evaluate(names.dataPath, input);
      }
    } catch (e) {
      if (e instanceof OpaUnavailableError) throw new ServiceUnavailableException(ENGINE_DOWN);
      throw e;
    }
    if (!decision) throw new ServiceUnavailableException(ENGINE_DOWN);
    const latencyMs = Math.round(performance.now() - started);
    const rule = decision.rule ? (ruleSet.rules.find((r) => r.id === decision.rule)?.label ?? decision.rule) : null;
    const response = {
      allowed: decision.allowed,
      reason: decision.reason,
      outcomes: decision.outcomes,
      rule,
      policy: { key: p.key, version: null },
      decisionId: `dec_${randomUUID().replace(/-/g, "")}`,
    };
    this.audit.enqueue({
      id: response.decisionId,
      workspaceId: ref.workspaceId,
      policyId: p.id,
      versionNumber: null,
      source: "PLAYGROUND",
      input,
      result: response,
      allowed: response.allowed,
      matchedRule: rule,
      missingFields,
      latencyMs,
      createdAt: new Date(),
    });
    return { ...response, target, latencyMs, missingFields, typeErrors };
  }
}
