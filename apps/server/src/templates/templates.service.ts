import { Injectable, NotFoundException } from "@nestjs/common";
import { describeRule } from "@peng/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { PoliciesService, WorkspaceRef } from "../policies/policies.service.js";
import { TEMPLATES, templateById } from "./definitions/index.js";

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: PoliciesService,
  ) {}

  list() {
    return TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      preview: t.ruleSet.rules.map((r) => describeRule(r, t.ruleSet)),
    }));
  }

  /** Create a Draft policy from a template (key suffixed -2, -3… if taken) with the template's samples. */
  async use(ref: WorkspaceRef, templateId: string, opts: { key?: string; name?: string } = {}) {
    const t = templateById(templateId);
    if (!t) throw new NotFoundException("Template not found");
    const base = opts.key ?? t.id;
    const taken = new Set((await this.prisma.scoped.policy.findMany({ where: { key: { startsWith: base } }, select: { key: true } })).map((p) => p.key));
    let key = base;
    for (let n = 2; taken.has(key); n++) key = `${base}-${n}`;

    const policy = await this.policies.create(ref, { key, name: opts.name ?? t.name, description: t.description, ruleSet: structuredClone(t.ruleSet) });
    await this.prisma.scoped.samplePayload.createMany({
      data: t.samples.map((s) => ({ workspaceId: ref.workspaceId, policyId: policy.id, name: s.name, input: s.input as object })),
    });
    return policy;
  }
}
