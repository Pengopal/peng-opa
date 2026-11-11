import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { emptyRuleSet, validateRuleSet, type RuleSet } from "@peng/shared";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { newShortId } from "../prisma/short-id.js";
import { OPA_GATEWAY, OpaGateway } from "../opa-gateway/opa-gateway.js";
import { OpaUnavailableError } from "../opa-gateway/errors.js";
import { draftNames, opaNames } from "../rego-compiler/naming.js";
import { PolicyEventsService } from "./policy-events.service.js";

export const POLICY_KEY_PATTERN = /^[a-z0-9-]{3,60}$/;
const DAY_MS = 86_400_000;

const sameRuleSet = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export interface WorkspaceRef {
  workspaceId: string;
  workspaceShortId: string;
  userId: string;
}

/** Policy CRUD and draft autosave. Every method runs inside the workspace context. */
@Injectable()
export class PoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: PolicyEventsService,
    @Inject(OPA_GATEWAY) private readonly opa: OpaGateway,
  ) {}

  async list() {
    const policies = await this.prisma.scoped.policy.findMany({ orderBy: { updatedAt: "desc" } });
    const liveIds = policies.map((p) => p.liveVersionId).filter((id): id is string => !!id);
    const live = new Map(
      (await this.prisma.scoped.policyVersion.findMany({ where: { id: { in: liveIds } } })).map((v) => [v.id, v]),
    );
    const counts = await this.prisma.scoped.decision.groupBy({
      by: ["policyId"],
      where: { createdAt: { gte: new Date(Date.now() - 7 * DAY_MS) } },
      _count: { _all: true },
    });
    const decisions7d = new Map(counts.map((c) => [c.policyId, c._count._all]));
    return policies.map((p) => {
      const v = p.liveVersionId ? live.get(p.liveVersionId) : undefined;
      return {
        id: p.id,
        key: p.key,
        name: p.name,
        description: p.description,
        status: p.status,
        liveVersion: v ? { number: v.number, publishedAt: v.publishedAt } : null,
        hasDraftChanges: v ? !sameRuleSet(v.ruleSet, p.draft) : true,
        decisions7d: decisions7d.get(p.id) ?? 0,
        updatedAt: p.updatedAt,
      };
    });
  }

  async create(ref: WorkspaceRef, input: { key: string; name: string; description?: string; ruleSet?: RuleSet }) {
    if (!POLICY_KEY_PATTERN.test(input.key)) {
      throw new UnprocessableEntityException("Key must be 3–60 lowercase letters, digits or hyphens, like checkout-discount");
    }
    try {
      const policy = await this.prisma.scoped.policy.create({
        data: {
          workspaceId: ref.workspaceId,
          shortId: newShortId(),
          key: input.key,
          name: input.name,
          description: input.description,
          draft: (input.ruleSet ?? emptyRuleSet()) as object,
        },
      });
      await this.events.record(ref.workspaceId, policy, "CREATED", ref.userId);
      return this.get(policy.id);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException(`A policy with key "${input.key}" already exists`);
      }
      throw e;
    }
  }

  async get(id: string) {
    const p = await this.find(id);
    const v = p.liveVersionId ? await this.prisma.scoped.policyVersion.findUnique({ where: { id: p.liveVersionId } }) : null;
    const draft = p.draft as unknown as RuleSet;
    return {
      id: p.id,
      shortId: p.shortId,
      key: p.key,
      name: p.name,
      description: p.description,
      status: p.status,
      draft,
      issues: validateRuleSet(draft),
      liveVersion: v ? { number: v.number, publishedAt: v.publishedAt } : null,
      hasDraftChanges: v ? !sameRuleSet(v.ruleSet, p.draft) : true,
      updatedAt: p.updatedAt,
    };
  }

  async update(id: string, input: { name?: string; description?: string | null; key?: string }) {
    const p = await this.find(id);
    if (input.key !== undefined && input.key !== p.key) {
      if (p.liveVersionId) throw new ConflictException("The key can't change after the policy has been published: integrations call it by key");
      if (!POLICY_KEY_PATTERN.test(input.key)) throw new UnprocessableEntityException("Key must be 3–60 lowercase letters, digits or hyphens");
    }
    try {
      await this.prisma.scoped.policy.update({ where: { id }, data: { name: input.name, description: input.description, key: input.key } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ConflictException(`Key "${input.key}" is taken`);
      throw e;
    }
    return this.get(id);
  }

  /** Autosave: always stores the draft; issues are returned for the editor to show inline. */
  async saveDraft(id: string, ruleSet: RuleSet) {
    await this.find(id);
    await this.prisma.scoped.policy.update({ where: { id }, data: { draft: ruleSet as object } });
    return { issues: validateRuleSet(ruleSet) };
  }

  async delete(ref: WorkspaceRef, id: string) {
    const p = await this.find(id);
    await this.prisma.scoped.policy.delete({ where: { id } });
    await this.events.record(ref.workspaceId, p, "DELETED", ref.userId);
    try {
      await this.opa.deletePolicy(opaNames(ref.workspaceShortId, p.key).policyId);
      await this.opa.deletePolicy(draftNames(ref.workspaceShortId, p.shortId).policyId);
    } catch (e) {
      if (!(e instanceof OpaUnavailableError)) throw e; // sync removes orphans when OPA is back
    }
  }

  async find(id: string) {
    const p = await this.prisma.scoped.policy.findUnique({ where: { id } });
    if (!p) throw new NotFoundException("Policy not found");
    return p;
  }
}
