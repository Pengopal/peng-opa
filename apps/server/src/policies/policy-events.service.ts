import { Injectable } from "@nestjs/common";
import type { PolicyEventType } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

/** Change history (Activity → Changes). Runs inside the workspace context. */
@Injectable()
export class PolicyEventsService {
  constructor(private readonly prisma: PrismaService) {}

  record(
    workspaceId: string,
    policy: { id: string; key: string },
    type: PolicyEventType,
    actorId: string,
    versions: { from?: number | null; to?: number | null } = {},
  ) {
    return this.prisma.scoped.policyEvent.create({
      data: { workspaceId, policyId: policy.id, policyKey: policy.key, type, actorId, fromVersion: versions.from ?? null, toVersion: versions.to ?? null },
    });
  }
}
