import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuditWriter, DecisionRecord } from "./audit-writer.js";

const FLUSH_EVERY_MS = 1_000;
const FLUSH_AT = 200;
const MAX_QUEUE = 10_000;

const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/**
 * Queues decisions in memory and writes them every second or every 200 records, updating
 * UsageDaily in the same transaction. On shutdown the queue is written out. If the database
 * fails, records are kept for the next attempt (up to 10,000; the oldest are dropped beyond that).
 * Uses the unscoped client: one batch spans workspaces and every record carries its workspaceId.
 */
@Injectable()
export class DbAuditWriter implements AuditWriter, OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DbAuditWriter.name);
  private queue: DecisionRecord[] = [];
  private timer?: NodeJS.Timeout;
  private flushing?: Promise<void>;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.flush(), FLUSH_EVERY_MS);
    this.timer.unref();
  }

  async onApplicationShutdown() {
    clearInterval(this.timer);
    await this.flush();
    if (this.queue.length) await this.flush(); // records queued while the last flush ran
  }

  enqueue(record: DecisionRecord): void {
    this.queue.push(record);
    if (this.queue.length > MAX_QUEUE) {
      this.queue.splice(0, this.queue.length - MAX_QUEUE);
      this.logger.warn(`Decision queue over ${MAX_QUEUE}; oldest records dropped`);
    }
    if (this.queue.length >= FLUSH_AT) void this.flush();
  }

  /** Write everything queued; concurrent callers wait for the flush in progress. */
  async flush(): Promise<void> {
    if (this.flushing) return this.flushing;
    if (!this.queue.length) return;
    const batch = this.queue;
    this.queue = [];
    this.flushing = this.write(batch)
      .catch((e: Error) => {
        this.logger.error(`Writing ${batch.length} decisions failed; will retry: ${e.message}`);
        this.queue = [...batch, ...this.queue].slice(-MAX_QUEUE);
      })
      .finally(() => (this.flushing = undefined));
    return this.flushing;
  }

  private async write(batch: DecisionRecord[]) {
    const usage = new Map<string, { workspaceId: string; policyId: string; date: Date; total: number; allowed: number }>();
    for (const r of batch) {
      const date = utcDay(r.createdAt);
      const key = `${r.workspaceId}|${r.policyId}|${date.toISOString()}`;
      const u = usage.get(key) ?? { workspaceId: r.workspaceId, policyId: r.policyId, date, total: 0, allowed: 0 };
      u.total++;
      if (r.allowed) u.allowed++;
      usage.set(key, u);
    }

    await this.prisma.unscoped.$transaction(async (tx) => {
      await tx.decision.createMany({
        data: batch.map((r) => ({
          id: r.id,
          workspaceId: r.workspaceId,
          policyId: r.policyId,
          versionNumber: r.versionNumber,
          source: r.source,
          input: r.input as object,
          result: r.result as object,
          allowed: r.allowed,
          matchedRule: r.matchedRule,
          missingFields: r.missingFields,
          latencyMs: r.latencyMs,
          createdAt: r.createdAt,
        })),
        skipDuplicates: true,
      });
      for (const u of usage.values()) {
        const dayWhere = {
          workspaceId: u.workspaceId,
          policyId: u.policyId,
          createdAt: { gte: u.date, lt: new Date(u.date.getTime() + 86_400_000) },
        };
        const n = await tx.decision.count({ where: dayWhere });
        // p95 (nearest rank): the value at ascending rank ceil(0.95 n) = descending offset n - ceil(0.95 n).
        const p95 = n
          ? ((await tx.decision.findFirst({ where: dayWhere, orderBy: { latencyMs: "desc" }, skip: n - Math.ceil(0.95 * n), select: { latencyMs: true } }))
              ?.latencyMs ?? 0)
          : 0;
        const id = { workspaceId: u.workspaceId, policyId: u.policyId, date: u.date };
        await tx.usageDaily.upsert({
          where: { workspaceId_policyId_date: id },
          create: { ...id, total: u.total, allowed: u.allowed, denied: u.total - u.allowed, p95LatencyMs: p95 },
          update: { total: { increment: u.total }, allowed: { increment: u.allowed }, denied: { increment: u.total - u.allowed }, p95LatencyMs: p95 },
        });
      }
    });
  }
}
