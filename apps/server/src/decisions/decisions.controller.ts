import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { WorkspaceRoute } from "../auth/decorators.js";
import type { DecisionSource, Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

const PAGE = 50;
const SOURCES: DecisionSource[] = ["API", "PLAYGROUND", "DEMO"];

function parseDate(v: string | undefined, name: string) {
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`${name} must be a date`);
  return d;
}

/** Activity → Decisions. Cursor = id of the last item of the previous page (newest first). */
@Controller("api/decisions")
export class DecisionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @WorkspaceRoute("VIEWER")
  async list(
    @Query("policyId") policyId?: string,
    @Query("allowed") allowed?: string,
    @Query("source") source?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("cursor") cursor?: string,
  ) {
    if (source && !SOURCES.includes(source as DecisionSource)) throw new BadRequestException(`source must be one of ${SOURCES.join(", ")}`);
    const where: Prisma.DecisionWhereInput = {
      ...(policyId ? { policyId } : {}),
      ...(allowed === "true" || allowed === "false" ? { allowed: allowed === "true" } : {}),
      ...(source ? { source: source as DecisionSource } : {}),
      createdAt: { gte: parseDate(from, "from"), lte: parseDate(to, "to") },
    };
    const rows = await this.prisma.scoped.decision.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, policyId: true, versionNumber: true, source: true, allowed: true, matchedRule: true, missingFields: true, latencyMs: true, createdAt: true },
    });
    const page = rows.slice(0, PAGE);
    const policies = await this.policyNames(page.map((d) => d.policyId));
    return {
      items: page.map((d) => ({ ...d, policyKey: policies.get(d.policyId)?.key ?? null, policyName: policies.get(d.policyId)?.name ?? "Deleted policy" })),
      nextCursor: rows.length > PAGE ? page[page.length - 1].id : null,
    };
  }

  @Get(":id")
  @WorkspaceRoute("VIEWER")
  async get(@Param("id") id: string) {
    const d = await this.prisma.scoped.decision.findUnique({ where: { id } });
    if (!d) throw new NotFoundException("Decision not found");
    const p = (await this.policyNames([d.policyId])).get(d.policyId);
    return { ...d, policyKey: p?.key ?? null, policyName: p?.name ?? "Deleted policy" };
  }

  private async policyNames(ids: string[]) {
    const rows = await this.prisma.scoped.policy.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, key: true, name: true } });
    return new Map(rows.map((p) => [p.id, p]));
  }
}
