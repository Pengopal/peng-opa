import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

const DAY_MS = 86_400_000;
const utcToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

/** Home dashboard numbers for the current workspace (UTC days). */
@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const db = this.prisma.scoped;
    const today = { createdAt: { gte: utcToday() } };
    const [total, allowed, livePolicies, firstApi, tested, published] = await Promise.all([
      db.decision.count({ where: today }),
      db.decision.count({ where: { ...today, allowed: true } }),
      db.policy.count({ where: { status: "LIVE" } }),
      db.decision.findFirst({ where: { source: "API" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      db.decision.findFirst({ where: { source: "PLAYGROUND" }, select: { id: true } }),
      db.policyVersion.findFirst({ select: { id: true } }),
    ]);
    let p95: number | null = null;
    if (total) {
      const row = await db.decision.findFirst({ where: today, orderBy: { latencyMs: "desc" }, skip: total - Math.ceil(0.95 * total), select: { latencyMs: true } });
      p95 = row?.latencyMs ?? null;
    }
    return {
      decisionsToday: total,
      allowRateToday: total ? allowed / total : null,
      livePolicies,
      p95LatencyToday: p95,
      firstApiCallAt: firstApi?.createdAt ?? null,
      hasTested: !!tested,
      hasPublished: !!published,
    };
  }

  /** Allowed/denied per day for the last `days` days (oldest first), zero-filled. */
  async daily(days: number, policyId?: string) {
    const end = utcToday();
    const start = new Date(end.getTime() - (days - 1) * DAY_MS);
    const rows = await this.prisma.scoped.usageDaily.groupBy({
      by: ["date"],
      where: { date: { gte: start }, ...(policyId ? { policyId } : {}) },
      _sum: { allowed: true, denied: true },
    });
    const byDay = new Map(rows.map((r) => [r.date.toISOString().slice(0, 10), r._sum]));
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(start.getTime() + i * DAY_MS).toISOString().slice(0, 10);
      const s = byDay.get(date);
      return { date, allowed: s?.allowed ?? 0, denied: s?.denied ?? 0 };
    });
  }

  async recent(limit: number) {
    const rows = await this.prisma.scoped.decision.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, policyId: true, allowed: true, matchedRule: true, source: true, createdAt: true },
    });
    const policies = await this.prisma.scoped.policy.findMany({ where: { id: { in: rows.map((r) => r.policyId) } }, select: { id: true, name: true } });
    const names = new Map(policies.map((p) => [p.id, p.name]));
    return rows.map((r) => ({ ...r, policyName: names.get(r.policyId) ?? "Deleted policy" }));
  }
}
