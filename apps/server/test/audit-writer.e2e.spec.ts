import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { AUDIT_WRITER, AuditWriter } from "../src/decisions/audit-writer.js";
import { startTestStack, TestStack } from "./support/stack.js";
import { createTestApp } from "./support/app.js";
import { liveWorkspace } from "./support/fixtures.js";

describe("audit writer", () => {
  let stack: TestStack;
  let app: INestApplication;

  beforeAll(async () => {
    stack = await startTestStack();
    app = await createTestApp(stack);
  });
  afterAll(async () => {
    await app?.close();
    await stack?.stop();
  });

  it("writes decisions within about a second and keeps daily usage (totals, allowed, denied, p95)", async () => {
    const w = await liveWorkspace(app);
    const call = (tier: string) =>
      request(app.getHttpServer())
        .post(`/v1/decide/${w.policyKey}`)
        .set("Authorization", `Bearer ${w.apiKey}`)
        .send({ input: { customer: { tier }, order: { total: 600 } } });
    for (const tier of ["gold", "gold", "gold", "bronze"]) expect((await call(tier)).status).toBe(200);

    const prisma = app.get(PrismaService);
    await vi.waitFor(async () => expect(await prisma.unscoped.decision.count({ where: { workspaceId: w.workspaceId } })).toBe(4), {
      timeout: 2500,
      interval: 100,
    });
    const usage = await prisma.unscoped.usageDaily.findMany({ where: { workspaceId: w.workspaceId } });
    expect(usage).toEqual([expect.objectContaining({ policyId: w.policyId, total: 4, allowed: 3, denied: 1 })]);
    const latencies = (await prisma.unscoped.decision.findMany({ where: { workspaceId: w.workspaceId }, select: { latencyMs: true } }))
      .map((d) => d.latencyMs)
      .sort((a, b) => a - b);
    expect(usage[0].p95LatencyMs).toBe(latencies[Math.ceil(0.95 * latencies.length) - 1]);
  });

  it("flushes the queue on shutdown", async () => {
    const w = await liveWorkspace(app, "shutdown-flush");
    const second = await createTestApp(stack);
    const writer = second.get<AuditWriter>(AUDIT_WRITER);
    for (let i = 0; i < 3; i++) {
      writer.enqueue({
        id: `dec_${randomUUID().replace(/-/g, "")}`,
        workspaceId: w.workspaceId,
        policyId: w.policyId,
        versionNumber: 1,
        source: "API",
        input: {},
        result: {},
        allowed: true,
        matchedRule: null,
        missingFields: [],
        latencyMs: 3,
        createdAt: new Date(),
      });
    }
    await second.close();
    expect(await app.get(PrismaService).unscoped.decision.count({ where: { policyId: w.policyId } })).toBe(3);
  });
});
