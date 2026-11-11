import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { sampleRuleSet } from "@peng/shared";
import { DbAuditWriter } from "../src/decisions/db-audit-writer.service.js";
import { startTestStack, TestStack } from "./support/stack.js";
import { createTestApp } from "./support/app.js";
import { liveWorkspace } from "./support/fixtures.js";

const gold = { customer: { tier: "gold" }, order: { total: 600 } };

describe("playground and decision log", () => {
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

  it("tries the unpublished draft while live keeps the published version", async () => {
    const w = await liveWorkspace(app);
    const changed = sampleRuleSet();
    changed.rules[0].result.outcomes.discount = 30;
    await w.ws(w.agent.put(`/api/policies/${w.policyId}/draft`)).send({ ruleSet: changed });

    const draft = await w.ws(w.agent.post(`/api/policies/${w.policyId}/try`)).send({ input: gold, target: "draft" });
    expect(draft.status).toBe(201);
    expect(draft.body).toMatchObject({ target: "draft", allowed: true, rule: "Gold customers", outcomes: { discount: 30 }, missingFields: [], typeErrors: [] });

    const live = await w.ws(w.agent.post(`/api/policies/${w.policyId}/try`)).send({ input: { customer: { tier: "gold" } }, target: "live" });
    expect(live.body).toMatchObject({ target: "live", allowed: false, policy: { version: 1 }, missingFields: ["order.total"] });
  });

  it("refuses to try a draft that has errors", async () => {
    const w = await liveWorkspace(app, "broken");
    const bad = sampleRuleSet();
    bad.rules[0].conditions[0].field = "nope";
    await w.ws(w.agent.put(`/api/policies/${w.policyId}/draft`)).send({ ruleSet: bad });
    const res = await w.ws(w.agent.post(`/api/policies/${w.policyId}/try`)).send({ input: gold, target: "draft" });
    expect(res.status).toBe(422);
    expect(res.body.issues).toEqual([expect.objectContaining({ code: "unknown_field" })]);
  });

  it("lists decisions with filters, only for the caller's workspace", async () => {
    const a = await liveWorkspace(app, "log-a");
    const b = await liveWorkspace(app, "log-b");
    const api = (w: typeof a, tier: string) =>
      request(app.getHttpServer()).post(`/v1/decide/${w.policyKey}`).set("Authorization", `Bearer ${w.apiKey}`).send({ input: { ...gold, customer: { tier } } });
    await api(a, "gold");
    await api(a, "bronze");
    await api(b, "gold");
    await a.ws(a.agent.post(`/api/policies/${a.policyId}/try`)).send({ input: gold, target: "live" });
    await app.get(DbAuditWriter).flush();

    const all = (await a.ws(a.agent.get("/api/decisions"))).body;
    expect(all.items).toHaveLength(3);
    expect(all.items.every((d: { policyKey: string }) => d.policyKey === "log-a")).toBe(true);

    const denied = (await a.ws(a.agent.get("/api/decisions?allowed=false&source=API"))).body.items;
    expect(denied).toHaveLength(1);
    expect(denied[0]).toMatchObject({ allowed: false, source: "API" });

    const detail = await a.ws(a.agent.get(`/api/decisions/${denied[0].id}`));
    expect(detail.body.input).toEqual({ ...gold, customer: { tier: "bronze" } });
    expect((await b.ws(b.agent.get(`/api/decisions/${denied[0].id}`))).status).toBe(404);
  });
});
