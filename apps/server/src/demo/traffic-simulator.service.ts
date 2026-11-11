import { Injectable, Logger, OnApplicationShutdown } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { DecideService, DecideTarget } from "../decisions/decide.service.js";
import { templateById } from "../templates/definitions/index.js";

export const TRAFFIC_DURATION_MS = 10 * 60_000;
const EVERY_MS = 1_000;

interface Run {
  interval: NodeJS.Timeout;
  stopAt: NodeJS.Timeout;
  endsAt: Date;
}

/** Sends ~1 request/s through the real decision path (source DEMO) for a demo workspace; stops itself. */
@Injectable()
export class TrafficSimulator implements OnApplicationShutdown {
  private readonly logger = new Logger(TrafficSimulator.name);
  private readonly runs = new Map<string, Run>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly decide: DecideService,
  ) {}

  start(target: DecideTarget, durationMs = TRAFFIC_DURATION_MS) {
    this.stop(target.workspaceId);
    const interval = setInterval(() => void this.tick(target), EVERY_MS);
    const stopAt = setTimeout(() => this.stop(target.workspaceId), durationMs);
    interval.unref();
    stopAt.unref();
    const endsAt = new Date(Date.now() + durationMs);
    this.runs.set(target.workspaceId, { interval, stopAt, endsAt });
    return this.status(target.workspaceId);
  }

  stop(workspaceId: string) {
    const run = this.runs.get(workspaceId);
    if (run) {
      clearInterval(run.interval);
      clearTimeout(run.stopAt);
      this.runs.delete(workspaceId);
    }
    return this.status(workspaceId);
  }

  status(workspaceId: string): { on: boolean; endsAt: Date | null } {
    const run = this.runs.get(workspaceId);
    return { on: !!run, endsAt: run?.endsAt ?? null };
  }

  onApplicationShutdown() {
    for (const id of [...this.runs.keys()]) this.stop(id);
  }

  private async tick(target: DecideTarget) {
    try {
      const live = await this.prisma.unscoped.policy.findMany({ where: { workspaceId: target.workspaceId, status: "LIVE" }, select: { key: true } });
      const candidates = live.map((p) => p.key).filter((k) => templateById(k));
      if (!candidates.length) return;
      const key = candidates[Math.floor(Math.random() * candidates.length)];
      await this.decide.decide(target, key, templateById(key)!.generateInput(Math.random), "DEMO");
    } catch (e) {
      this.logger.debug(`demo traffic tick skipped: ${(e as Error).message}`);
    }
  }
}
