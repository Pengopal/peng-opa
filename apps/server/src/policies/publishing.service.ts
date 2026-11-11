import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { diffRuleSets, emptyRuleSet, validateRuleSet, type RuleSet } from "@peng/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { OPA_GATEWAY, OpaGateway } from "../opa-gateway/opa-gateway.js";
import { OpaCompileError, OpaUnavailableError } from "../opa-gateway/errors.js";
import { compileRuleSet } from "../rego-compiler/compile.js";
import { opaNames } from "../rego-compiler/naming.js";
import { KeyedLock } from "../common/keyed-lock.js";
import { PoliciesService, WorkspaceRef } from "./policies.service.js";
import { PolicyEventsService } from "./policy-events.service.js";

export const regoHash = (rego: string) => createHash("sha256").update(rego).digest("hex");

const ENGINE_DOWN = "The policy engine is unavailable right now. Nothing was changed; try again in a moment.";

/** Publish, rollback, restore, pause and resume. Every method runs inside the workspace context. */
@Injectable()
export class PublishingService {
  private readonly lock = new KeyedLock();

  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: PoliciesService,
    private readonly events: PolicyEventsService,
    @Inject(OPA_GATEWAY) private readonly opa: OpaGateway,
  ) {}

  async preview(id: string) {
    const p = await this.policies.find(id);
    const live = await this.liveVersion(p.liveVersionId);
    const draft = p.draft as unknown as RuleSet;
    return { issues: validateRuleSet(draft), changes: diffRuleSets((live?.ruleSet as unknown as RuleSet) ?? emptyRuleSet(), draft) };
  }

  /** Publish the current draft as the next version. */
  publishDraft(ref: WorkspaceRef, id: string, note?: string) {
    return this.lock.run(id, async () => {
      const p = await this.policies.find(id);
      return this.publish(ref, p, p.draft as unknown as RuleSet, note, "PUBLISHED");
    });
  }

  /** Publish a copy of version `n` as the next version. */
  rollback(ref: WorkspaceRef, id: string, n: number, note?: string) {
    return this.lock.run(id, async () => {
      const p = await this.policies.find(id);
      const v = await this.version(id, n);
      return this.publish(ref, p, v.ruleSet as unknown as RuleSet, note ?? `Rolled back to v${n}`, "ROLLED_BACK");
    });
  }

  async restoreDraft(id: string, n: number) {
    const v = await this.version(id, n);
    await this.prisma.scoped.policy.update({ where: { id }, data: { draft: v.ruleSet as object } });
    return { restored: n };
  }

  pause(ref: WorkspaceRef, id: string) {
    return this.lock.run(id, async () => {
      const p = await this.policies.find(id);
      if (p.status !== "LIVE") throw new ConflictException("Only a live policy can be paused");
      await this.engine(() => this.opa.deletePolicy(opaNames(ref.workspaceShortId, p.key).policyId));
      await this.prisma.scoped.policy.update({ where: { id }, data: { status: "PAUSED" } });
      await this.events.record(ref.workspaceId, p, "PAUSED", ref.userId);
      return { status: "PAUSED" };
    });
  }

  resume(ref: WorkspaceRef, id: string) {
    return this.lock.run(id, async () => {
      const p = await this.policies.find(id);
      const live = await this.liveVersion(p.liveVersionId);
      if (p.status !== "PAUSED" || !live) throw new ConflictException("Only a paused policy can be resumed");
      await this.engine(() => this.opa.upsertPolicy(opaNames(ref.workspaceShortId, p.key).policyId, live.rego));
      await this.prisma.scoped.policy.update({ where: { id }, data: { status: "LIVE", opaHash: regoHash(live.rego) } });
      await this.events.record(ref.workspaceId, p, "RESUMED", ref.userId);
      return { status: "LIVE" };
    });
  }

  async versions(id: string) {
    await this.policies.find(id);
    const versions = await this.prisma.scoped.policyVersion.findMany({ where: { policyId: id }, orderBy: { number: "desc" } });
    const users = await this.prisma.unscoped.user.findMany({
      where: { id: { in: [...new Set(versions.map((v) => v.publishedById))] } },
      select: { id: true, name: true },
    });
    const names = new Map(users.map((u) => [u.id, u.name]));
    return versions.map((v) => ({ number: v.number, note: v.note, publishedAt: v.publishedAt, publishedBy: names.get(v.publishedById) ?? null }));
  }

  async versionDetail(id: string, n: number) {
    const v = await this.version(id, n);
    return { number: v.number, note: v.note, publishedAt: v.publishedAt, ruleSet: v.ruleSet, rego: v.rego };
  }

  /** Rego for the draft (compiled now), the live version, or version n. */
  async rego(ref: WorkspaceRef, id: string, source: string) {
    const p = await this.policies.find(id);
    if (source === "draft") {
      const ruleSet = p.draft as unknown as RuleSet;
      const errors = validateRuleSet(ruleSet).filter((i) => i.severity === "error");
      if (errors.length) throw new UnprocessableEntityException({ message: "Fix the issues to see the Rego", issues: errors });
      return { source, rego: compileRuleSet(opaNames(ref.workspaceShortId, p.key).packageName, ruleSet) };
    }
    if (source === "live") {
      const live = await this.liveVersion(p.liveVersionId);
      if (!live) throw new NotFoundException("This policy has not been published yet");
      return { source, rego: live.rego };
    }
    return { source, rego: (await this.version(id, Number(source))).rego };
  }

  private async publish(ref: WorkspaceRef, p: { id: string; key: string; liveVersionId: string | null }, ruleSet: RuleSet, note: string | undefined, type: "PUBLISHED" | "ROLLED_BACK") {
    const issues = validateRuleSet(ruleSet).filter((i) => i.severity === "error");
    if (issues.length) throw new UnprocessableEntityException({ message: `Fix ${issues.length} issue(s) before publishing`, issues });

    const names = opaNames(ref.workspaceShortId, p.key);
    const rego = compileRuleSet(names.packageName, ruleSet);
    try {
      await this.opa.upsertPolicy(names.policyId, rego);
    } catch (e) {
      if (e instanceof OpaCompileError) throw new UnprocessableEntityException({ message: "The policy engine rejected this policy", issues: [], engine: e.messages });
      if (e instanceof OpaUnavailableError) throw new ServiceUnavailableException(ENGINE_DOWN);
      throw e;
    }

    const previous = await this.liveVersion(p.liveVersionId);
    try {
      const number = await this.prisma.scoped.$transaction(async (tx) => {
        const last = await tx.policyVersion.findFirst({ where: { policyId: p.id }, orderBy: { number: "desc" }, select: { number: true } });
        const number = (last?.number ?? 0) + 1;
        const v = await tx.policyVersion.create({
          data: { workspaceId: ref.workspaceId, policyId: p.id, number, ruleSet: ruleSet as object, rego, note, publishedById: ref.userId },
        });
        await tx.policy.update({ where: { id: p.id }, data: { liveVersionId: v.id, status: "LIVE", opaHash: regoHash(rego) } });
        await tx.policyEvent.create({
          data: { workspaceId: ref.workspaceId, policyId: p.id, policyKey: p.key, type, actorId: ref.userId, fromVersion: previous?.number ?? null, toVersion: number },
        });
        return number;
      });
      return { version: number };
    } catch (e) {
      // OPA already has the new module; put the previous live one back (sync repairs it otherwise).
      if (previous) await this.opa.upsertPolicy(names.policyId, previous.rego).catch(() => undefined);
      else await this.opa.deletePolicy(names.policyId).catch(() => undefined);
      throw e;
    }
  }

  private async engine<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof OpaUnavailableError) throw new ServiceUnavailableException(ENGINE_DOWN);
      throw e;
    }
  }

  private liveVersion(liveVersionId: string | null) {
    return liveVersionId ? this.prisma.scoped.policyVersion.findUnique({ where: { id: liveVersionId } }) : Promise.resolve(null);
  }

  private async version(policyId: string, n: number) {
    if (!Number.isInteger(n) || n < 1) throw new NotFoundException("Version not found");
    await this.policies.find(policyId);
    const v = await this.prisma.scoped.policyVersion.findUnique({ where: { policyId_number: { policyId, number: n } } });
    if (!v) throw new NotFoundException(`Version ${n} not found`);
    return v;
  }
}
