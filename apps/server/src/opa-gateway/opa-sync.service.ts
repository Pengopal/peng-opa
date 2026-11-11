import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import { opaNames } from "../rego-compiler/naming.js";
import { OPA_GATEWAY, OpaGateway } from "./opa-gateway.js";
import { OpaUnavailableError } from "./errors.js";

const SYNC_EVERY_MS = 60_000;
const HEALTH_EVERY_MS = 5_000;
const DRAFT_TTL_MS = 60 * 60_000;

const hash = (rego: string) => createHash("sha256").update(rego).digest("hex");

/**
 * Keeps OPA equal to the database: pushes every LIVE policy whose module is missing or differs,
 * and removes t_* modules of deleted or paused policies and drafts unused for an hour.
 * Runs at startup, every 60 s, and as soon as OPA becomes healthy again.
 */
@Injectable()
export class OpaSyncService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OpaSyncService.name);
  private readonly draftsUsedAt = new Map<string, number>();
  private timers: NodeJS.Timeout[] = [];
  private running?: Promise<{ pushed: number; deleted: number }>;
  private healthy = true;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPA_GATEWAY) private readonly opa: OpaGateway,
  ) {}

  onApplicationBootstrap() {
    void this.syncAll().catch(() => undefined);
    this.timers.push(setInterval(() => void this.syncAll().catch(() => undefined), SYNC_EVERY_MS));
    this.timers.push(setInterval(() => void this.watchHealth(), HEALTH_EVERY_MS));
    this.timers.forEach((t) => t.unref());
  }

  onApplicationShutdown() {
    this.timers.forEach(clearInterval);
  }

  /** Record that a Try-it draft module was just used, so the sweep keeps it for an hour. */
  markDraftUsed(opaPolicyId: string, at = Date.now()) {
    this.draftsUsedAt.set(opaPolicyId, at);
  }

  /** One sync pass; concurrent callers share the pass in flight. */
  syncAll(): Promise<{ pushed: number; deleted: number }> {
    this.running ??= this.pass().finally(() => (this.running = undefined));
    return this.running;
  }

  private async pass() {
    let loaded: { id: string; raw: string }[];
    try {
      loaded = await this.opa.listPolicies("t_");
    } catch (e) {
      if (e instanceof OpaUnavailableError) return { pushed: 0, deleted: 0 };
      throw e;
    }
    const loadedHash = new Map(loaded.map((p) => [p.id, hash(p.raw)]));

    const policies = await this.prisma.unscoped.policy.findMany({
      select: { key: true, status: true, liveVersionId: true, workspace: { select: { shortId: true } } },
    });
    const liveVersions = new Map(
      (
        await this.prisma.unscoped.policyVersion.findMany({
          where: { id: { in: policies.filter((p) => p.status === "LIVE" && p.liveVersionId).map((p) => p.liveVersionId!) } },
          select: { id: true, rego: true },
        })
      ).map((v) => [v.id, v.rego]),
    );

    const keep = new Set<string>();
    let pushed = 0;
    for (const p of policies) {
      const id = opaNames(p.workspace.shortId, p.key).policyId;
      if (p.status === "DRAFT") keep.add(id); // may be mid-way through its first publish
      if (p.status !== "LIVE" || !p.liveVersionId) continue;
      keep.add(id);
      const rego = liveVersions.get(p.liveVersionId);
      if (rego !== undefined && loadedHash.get(id) !== hash(rego)) {
        await this.opa.upsertPolicy(id, rego);
        pushed++;
      }
    }

    const now = Date.now();
    let deleted = 0;
    for (const { id } of loaded) {
      if (keep.has(id)) continue;
      if (id.includes("/_draft_") && now - (this.draftsUsedAt.get(id) ?? 0) < DRAFT_TTL_MS) continue;
      await this.opa.deletePolicy(id);
      this.draftsUsedAt.delete(id);
      deleted++;
    }
    if (pushed || deleted) this.logger.log(`OPA sync: pushed ${pushed}, removed ${deleted}`);
    return { pushed, deleted };
  }

  private async watchHealth() {
    const ok = await this.opa.health();
    if (ok && !this.healthy) void this.syncAll().catch(() => undefined);
    this.healthy = ok;
  }
}
