import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { AUDIT_WRITER, AuditWriter, DecisionRecord } from "../src/decisions/audit-writer.js";
import { startTestStack, TestStack } from "./support/stack.js";
import { createTestApp } from "./support/app.js";
import { liveWorkspace } from "./support/fixtures.js";

const gold = { customer: { tier: "gold" }, order: { total: 600 } };

describe("POST /v1/decide/:policyKey", () => {
  let stack: TestStack;
  let app: INestApplication;
  const records: DecisionRecord[] = [];
  const recorder: AuditWriter = { enqueue: (r) => void records.push(r) };

  beforeAll(async () => {
    stack = await startTestStack();
    app = await createTestApp(stack, {}, [{ provide: AUDIT_WRITER, useValue: recorder }]);
  });
  afterAll(async () => {
    await app?.close();
    await stack?.stop();
  });

  const decide = (key: string, apiKey: string, body: unknown) =>
    request(app.getHttpServer()).post(`/v1/decide/${key}`).set("Authorization", `Bearer ${apiKey}`).send(body as object);

  it("returns the decision with the matched rule's label, and records it (with missing fields)", async () => {
    const w = await liveWorkspace(app);
    const res = await decide(w.policyKey, w.apiKey, { input: gold });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      allowed: true,
      reason: "Gold loyalty",
      outcomes: { discount: 15 },
      rule: "Gold customers",
      policy: { key: "checkout-discount", version: 1 },
      decisionId: expect.stringMatching(/^dec_[a-z0-9]{32}$/),
    });

    await decide(w.policyKey, w.apiKey, { input: { customer: { tier: "gold" } } });
    expect(records.at(-1)).toMatchObject({
      workspaceId: w.workspaceId,
      policyId: w.policyId,
      versionNumber: 1,
      source: "API",
      allowed: false,
      matchedRule: null,
      missingFields: ["order.total"],
    });
  });

  it("isolates workspaces: a key only sees its own policies, and body workspace ids are ignored", async () => {
    const a = await liveWorkspace(app, "shared-name");
    const b = await liveWorkspace(app, "other-policy");
    expect((await decide("shared-name", b.apiKey, { input: gold })).body).toEqual({
      error: { code: "policy_not_found", message: expect.any(String) },
    });
    expect((await decide("shared-name", b.apiKey, { input: gold, workspaceId: a.workspaceId, tenant_code: a.shortId })).status).toBe(404);
    expect((await decide("shared-name", "pk_live_nope", { input: gold })).status).toBe(401);
  });

  it("returns 409 policy_not_live for draft and paused policies", async () => {
    const w = await liveWorkspace(app, "pausable");
    const draft = await w.ws(w.agent.post("/api/policies")).send({ key: "never-published", name: "Draft" });
    expect(draft.status).toBe(201);
    expect((await decide("never-published", w.apiKey, { input: gold })).body.error.code).toBe("policy_not_live");

    await w.ws(w.agent.post(`/api/policies/${w.policyId}/pause`)).send({});
    const res = await decide("pausable", w.apiKey, { input: gold });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("policy_not_live");
  });

  it("rejects wrongly typed input with 422 and oversized bodies with 413", async () => {
    const w = await liveWorkspace(app, "typed");
    const res = await decide("typed", w.apiKey, { input: { customer: { tier: "gold" }, order: { total: "620" } } });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({ code: "invalid_input", details: [{ field: "order.total", expected: "number" }] });
    expect((await decide("typed", w.apiKey, { notInput: 1 })).status).toBe(422);

    const big = await decide("typed", w.apiKey, { input: { blob: "x".repeat(70 * 1024) } });
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe("payload_too_large");
  });

  it("returns 503 engine_unavailable when OPA is down", async () => {
    const w = await liveWorkspace(app, "fragile");
    await stack.killOpa();
    try {
      const res = await decide("fragile", w.apiKey, { input: gold });
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe("engine_unavailable");
    } finally {
      await stack.startOpa();
    }
  });

  it("batch: answers up to 100 inputs in order, rejects 101", async () => {
    const w = await liveWorkspace(app, "batchy");
    const inputs = Array.from({ length: 100 }, (_, i) => ({ customer: { tier: i % 2 ? "gold" : "bronze" }, order: { total: 600 } }));
    const res = await request(app.getHttpServer()).post("/v1/decide/batchy/batch").set("Authorization", `Bearer ${w.apiKey}`).send({ inputs });
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(100);
    expect(res.body.results.slice(0, 2).map((r: { allowed: boolean }) => r.allowed)).toEqual([false, true]);

    const tooMany = await request(app.getHttpServer())
      .post("/v1/decide/batchy/batch")
      .set("Authorization", `Bearer ${w.apiKey}`)
      .send({ inputs: [...inputs, inputs[0]] });
    expect(tooMany.status).toBe(422);
  });

  it("rate_limited_429 past the workspace limit", async () => {
    const limited = await createTestApp(stack, { RATE_LIMIT_RPS: "2" }, [{ provide: AUDIT_WRITER, useValue: recorder }]);
    try {
      const w = await liveWorkspace(limited, "limited");
      const call = () => request(limited.getHttpServer()).post("/v1/decide/limited").set("Authorization", `Bearer ${w.apiKey}`).send({ input: gold });
      const statuses = [];
      for (let i = 0; i < 4; i++) statuses.push((await call()).status);
      expect(statuses.slice(0, 2)).toEqual([200, 200]);
      expect(statuses).toContain(429);
    } finally {
      await limited.close();
    }
  });
});
