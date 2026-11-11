import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { DbAuditWriter } from "../src/decisions/db-audit-writer.service.js";
import { startTestStack, TestStack } from "./support/stack.js";
import { createTestApp } from "./support/app.js";
import { signUpWithWorkspace } from "./support/users.js";
import { liveWorkspace } from "./support/fixtures.js";

describe("insights", () => {
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

  it("summary: empty values are null, then reflects decisions and the setup checklist", async () => {
    const empty = await signUpWithWorkspace(app);
    expect((await empty.agent.get("/api/insights/summary").set("x-workspace-id", empty.workspaceId)).body).toEqual({
      decisionsToday: 0,
      allowRateToday: null,
      livePolicies: 0,
      p95LatencyToday: null,
      firstApiCallAt: null,
      hasTested: false,
      hasPublished: false,
    });

    const w = await liveWorkspace(app);
    await w.ws(w.agent.post(`/api/policies/${w.policyId}/try`)).send({ input: {}, target: "draft" });
    for (const tier of ["gold", "bronze", "gold", "gold"]) {
      await request(app.getHttpServer())
        .post(`/v1/decide/${w.policyKey}`)
        .set("Authorization", `Bearer ${w.apiKey}`)
        .send({ input: { customer: { tier }, order: { total: 600 } } });
    }
    await app.get(DbAuditWriter).flush();

    const s = (await w.ws(w.agent.get("/api/insights/summary"))).body;
    expect(s).toMatchObject({ decisionsToday: 5, livePolicies: 1, hasTested: true, hasPublished: true, firstApiCallAt: expect.any(String) });
    expect(s.allowRateToday).toBeCloseTo(3 / 5);
    expect(s.p95LatencyToday).toEqual(expect.any(Number));
  });

  it("daily: one zero-filled point per day, oldest first", async () => {
    const w = await liveWorkspace(app, "daily");
    const today = new Date();
    const day = (offset: number) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    await app.get(PrismaService).unscoped.usageDaily.create({
      data: { workspaceId: w.workspaceId, policyId: w.policyId, date: day(2), total: 7, allowed: 5, denied: 2, p95LatencyMs: 4 },
    });

    const points = (await w.ws(w.agent.get("/api/insights/daily?days=14"))).body;
    expect(points).toHaveLength(14);
    expect(points[13]).toEqual({ date: day(0).toISOString().slice(0, 10), allowed: 0, denied: 0 });
    expect(points[11]).toEqual({ date: day(2).toISOString().slice(0, 10), allowed: 5, denied: 2 });
  });
});
