import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { RuleSet } from "@peng/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { OPA_GATEWAY, OpaGateway, OpaDecision } from "../opa-gateway/opa-gateway.js";
import { opaNames } from "../rego-compiler/naming.js";
import { templateById } from "../templates/definitions/index.js";

export interface SeedPolicy {
  id: string;
  key: string;
  versionNumber: number;
  ruleSet: RuleSet;
}

const DAY_MS = 86_400_000;
const DAYS = 14;
/** Share of traffic per demo policy key (others get the remainder evenly). */
const WEIGHTS: Record<string, number> = { "checkout-discount": 0.4, "admin-console-access": 0.25, "refund-approval": 0.2, "loan-pre-approval": 0.15 };
const HOUR_WEIGHTS = Array.from({ length: 24 }, (_, h) => (h >= 8 && h <= 18 ? 3 : 1));

function pickWeighted<T>(rng: () => number, items: T[], weight: (t: T) => number): T {
  const total = items.reduce((s, t) => s + weight(t), 0);
  let r = rng() * total;
  for (const t of items) if ((r -= weight(t)) <= 0) return t;
  return items[items.length - 1];
}

/**
 * Writes ~3,000 backdated decisions over the last 14 UTC days (weekday-heavy, business-hours peak)
 * plus matching UsageDaily rows. Decisions are evaluated by the real policies in OPA, one query per
 * policy through a temporary `_seed` module, so the history agrees with the rules on screen.
 */
@Injectable()
export class HistorySeeder {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPA_GATEWAY) private readonly opa: OpaGateway,
  ) {}

  async seed(workspaceId: string, workspaceShortId: string, policies: SeedPolicy[], rng: () => number = Math.random): Promise<number> {
    const now = Date.now();
    const todayStart = Math.floor(now / DAY_MS) * DAY_MS;
    const planned: { policy: SeedPolicy; input: unknown; at: Date; latencyMs: number }[] = [];

    for (let back = DAYS - 1; back >= 0; back--) {
      const dayStart = todayStart - back * DAY_MS;
      const weekend = [0, 6].includes(new Date(dayStart).getUTCDay());
      const count = Math.round((weekend ? 110 : 250) * (0.85 + 0.3 * rng()));
      const dayEnd = back === 0 ? now : dayStart + DAY_MS - 1;
      for (let i = 0; i < count; i++) {
        const hour = pickWeighted(rng, HOUR_WEIGHTS.map((w, h) => ({ w, h })), (x) => x.w).h;
        let at = dayStart + hour * 3_600_000 + Math.floor(rng() * 3_600_000);
        if (at > dayEnd) at = dayStart + Math.floor(rng() * (dayEnd - dayStart + 1)); // today: only times already passed
        const policy = pickWeighted(rng, policies, (p) => WEIGHTS[p.key] ?? 0.1);
        const template = templateById(policy.key);
        if (!template) continue;
        planned.push({ policy, input: template.generateInput(rng), at: new Date(at), latencyMs: 2 + Math.floor(rng() * rng() * 9) });
      }
    }

    const decisions = new Map<number, OpaDecision>();
    const seedId = `t_${workspaceShortId}/_seed`;
    try {
      for (const policy of policies) {
        const idx = planned.flatMap((p, i) => (p.policy === policy ? [i] : []));
        if (!idx.length) continue;
        const pkg = opaNames(workspaceShortId, policy.key).packageName;
        await this.opa.upsertPolicy(
          seedId,
          `package t_${workspaceShortId}._seed\nimport rego.v1\nresults := [d | some x in input.items; d := data.${pkg}.decision with input as x]\n`,
        );
        const results = (await this.opa.evaluate(`t_${workspaceShortId}/_seed/results`, { items: idx.map((i) => planned[i].input) })) as unknown as OpaDecision[];
        idx.forEach((planIndex, k) => decisions.set(planIndex, results[k]));
      }
    } finally {
      await this.opa.deletePolicy(seedId).catch(() => undefined);
    }

    const rows = planned.flatMap((p, i) => {
      const d = decisions.get(i);
      if (!d) return [];
      const label = d.rule ? (p.policy.ruleSet.rules.find((r) => r.id === d.rule)?.label ?? d.rule) : null;
      const id = `dec_${randomUUID().replace(/-/g, "")}`;
      const result = { allowed: d.allowed, reason: d.reason, outcomes: d.outcomes, rule: label, policy: { key: p.policy.key, version: p.policy.versionNumber }, decisionId: id };
      return [{
        id,
        workspaceId,
        policyId: p.policy.id,
        versionNumber: p.policy.versionNumber,
        source: "API" as const,
        input: p.input as object,
        result: result as object,
        allowed: d.allowed,
        matchedRule: label,
        missingFields: [],
        latencyMs: p.latencyMs,
        createdAt: p.at,
      }];
    });

    const usage = new Map<string, { policyId: string; date: Date; latencies: number[]; allowed: number }>();
    for (const r of rows) {
      const date = new Date(Math.floor(r.createdAt.getTime() / DAY_MS) * DAY_MS);
      const key = `${r.policyId}|${date.getTime()}`;
      const u = usage.get(key) ?? { policyId: r.policyId, date, latencies: [], allowed: 0 };
      u.latencies.push(r.latencyMs);
      if (r.allowed) u.allowed++;
      usage.set(key, u);
    }

    const db = this.prisma.unscoped;
    for (let i = 0; i < rows.length; i += 1000) await db.decision.createMany({ data: rows.slice(i, i + 1000) });
    await db.usageDaily.createMany({
      data: [...usage.values()].map((u) => {
        const sorted = [...u.latencies].sort((a, b) => a - b);
        return {
          workspaceId,
          policyId: u.policyId,
          date: u.date,
          total: sorted.length,
          allowed: u.allowed,
          denied: sorted.length - u.allowed,
          p95LatencyMs: sorted[Math.ceil(0.95 * sorted.length) - 1],
        };
      }),
    });
    return rows.length;
  }
}
