import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { TrafficSimulator } from "../src/demo/traffic-simulator.service.js";
import { DbAuditWriter } from "../src/decisions/db-audit-writer.service.js";
import { startTestStack, TestStack } from "./support/stack.js";
import { createTestApp } from "./support/app.js";
import { signUp, signUpWithWorkspace } from "./support/users.js";

describe("demo mode", () => {
  let stack: TestStack;
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    stack = await startTestStack();
    app = await createTestApp(stack);
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    await app?.close();
    await stack?.stop();
  });

  it("creates Acme Retail with 4 live policies and ~3,000 decisions over 14 days", async () => {
    const u = await signUp(app);
    const res = await u.agent.post("/api/demo").send({});
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Acme Retail (Demo)", isDemo: true, role: "OWNER" });

    const policies = (await u.agent.get("/api/policies").set("x-workspace-id", res.body.id)).body;
    expect(policies.map((p: { key: string }) => p.key).sort()).toEqual(["admin-console-access", "checkout-discount", "loan-pre-approval", "refund-approval"]);
    expect(policies.every((p: { status: string }) => p.status === "LIVE")).toBe(true);

    const decisions = await prisma.unscoped.decision.findMany({ where: { workspaceId: res.body.id }, select: { createdAt: true, source: true } });
    expect(decisions.length).toBeGreaterThanOrEqual(2700);
    expect(decisions.length).toBeLessThanOrEqual(3300);
    const days = new Set(decisions.map((d) => d.createdAt.toISOString().slice(0, 10)));
    expect(days.size).toBe(14);
    expect(decisions.every((d) => d.createdAt <= new Date())).toBe(true);
    const usageTotal = (await prisma.unscoped.usageDaily.aggregate({ where: { workspaceId: res.body.id }, _sum: { total: true } }))._sum.total;
    expect(usageTotal).toBe(decisions.length);
  });

  it("reset restores the original demo; refused on normal workspaces; public login off by default", async () => {
    const u = await signUp(app);
    const demo = (await u.agent.post("/api/demo").send({})).body;
    const ws = <T extends { set(k: string, v: string): T }>(r: T) => r.set("x-workspace-id", demo.id);
    const checkout = (await ws(u.agent.get("/api/policies"))).body.find((p: { key: string }) => p.key === "checkout-discount");
    await ws(u.agent.delete(`/api/policies/${checkout.id}`));
    expect((await ws(u.agent.get("/api/policies"))).body).toHaveLength(3);

    expect((await ws(u.agent.post("/api/demo/reset")).send({})).status).toBe(201);
    const after = (await ws(u.agent.get("/api/policies"))).body;
    expect(after).toHaveLength(4);
    expect(after.find((p: { key: string }) => p.key === "checkout-discount")?.status).toBe("LIVE");

    const normal = await signUpWithWorkspace(app);
    expect((await normal.agent.post("/api/demo/reset").set("x-workspace-id", normal.workspaceId).send({})).status).toBe(403);
    expect((await request(app.getHttpServer()).post("/api/demo/public-login").send({})).status).toBe(404);
  });

  it("simulated traffic records DEMO decisions and switches itself off", async () => {
    const u = await signUp(app);
    const demo = (await u.agent.post("/api/demo").send({})).body;
    const on = await u.agent.post("/api/demo/traffic").set("x-workspace-id", demo.id).send({ on: true });
    expect(on.body).toMatchObject({ on: true, endsAt: expect.any(String) });
    expect(new Date(on.body.endsAt).getTime() - Date.now()).toBeGreaterThan(9 * 60_000);
    await u.agent.post("/api/demo/traffic").set("x-workspace-id", demo.id).send({ on: false });

    const sim = app.get(TrafficSimulator);
    sim.start({ workspaceId: demo.id, workspaceShortId: demo.shortId }, 2_500);
    await new Promise((r) => setTimeout(r, 4_000));
    expect(sim.status(demo.id)).toEqual({ on: false, endsAt: null });
    await app.get(DbAuditWriter).flush();
    const count = await prisma.unscoped.decision.count({ where: { workspaceId: demo.id, source: "DEMO" } });
    expect(count).toBeGreaterThanOrEqual(2);
    expect(count).toBeLessThanOrEqual(4);
  });
});
