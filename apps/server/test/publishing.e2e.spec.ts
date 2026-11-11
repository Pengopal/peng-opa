import type { INestApplication } from "@nestjs/common";
import { sampleRuleSet } from "@peng/shared";
import { OPA_GATEWAY, OpaGateway } from "../src/opa-gateway/opa-gateway.js";
import { opaNames } from "../src/rego-compiler/naming.js";
import { startTestStack, TestStack } from "./support/stack.js";
import { createTestApp } from "./support/app.js";
import { signUpWithWorkspace } from "./support/users.js";

const goldOrder = { customer: { tier: "gold" }, order: { total: 600 } };

describe("publishing, versions, rollback, pause", () => {
  let stack: TestStack;
  let app: INestApplication;
  let opa: OpaGateway;

  beforeAll(async () => {
    stack = await startTestStack();
    app = await createTestApp(stack);
    opa = app.get(OPA_GATEWAY);
  });
  afterAll(async () => {
    await app?.close();
    await stack?.stop();
  });

  /** A workspace with one policy whose draft is the sample rule set. */
  async function setup(key = "checkout-discount") {
    const o = await signUpWithWorkspace(app);
    const ws = (r: ReturnType<typeof o.agent.get>) => r.set("x-workspace-id", o.workspaceId);
    const p = await ws(o.agent.post("/api/policies")).send({ key, name: "Checkout", ruleSet: sampleRuleSet() });
    const evaluate = (input: unknown) => opa.evaluate(opaNames(o.shortId, key).dataPath, input);
    return { o, ws, id: p.body.id as string, evaluate };
  }

  it("publish_creates_v1_and_goes_live", async () => {
    const { ws, o, id, evaluate } = await setup();
    const res = await ws(o.agent.post(`/api/policies/${id}/publish`)).send({ note: "First" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ version: 1 });
    expect(await evaluate(goldOrder)).toMatchObject({ allowed: true, rule: "r1", outcomes: { discount: 15 } });
    const got = await ws(o.agent.get(`/api/policies/${id}`));
    expect(got.body).toMatchObject({ status: "LIVE", liveVersion: { number: 1 }, hasDraftChanges: false });
  });

  it("publish_with_errors_422_nothing_changes", async () => {
    const { ws, o, id, evaluate } = await setup();
    const bad = sampleRuleSet();
    bad.rules[0].conditions[0].value = "";
    await ws(o.agent.put(`/api/policies/${id}/draft`)).send({ ruleSet: bad });

    const res = await ws(o.agent.post(`/api/policies/${id}/publish`)).send({});
    expect(res.status).toBe(422);
    expect(res.body.issues).toEqual([expect.objectContaining({ code: "empty_value" })]);
    expect((await ws(o.agent.get(`/api/policies/${id}`))).body).toMatchObject({ status: "DRAFT", liveVersion: null });
    expect(await evaluate(goldOrder)).toBeUndefined();
  });

  it("opa_down_503_nothing_changes", async () => {
    const { ws, o, id } = await setup();
    await stack.killOpa();
    try {
      const res = await ws(o.agent.post(`/api/policies/${id}/publish`)).send({});
      expect(res.status).toBe(503);
    } finally {
      await stack.startOpa();
    }
    expect((await ws(o.agent.get(`/api/policies/${id}`))).body).toMatchObject({ status: "DRAFT", liveVersion: null });
    expect((await ws(o.agent.get(`/api/policies/${id}/versions`))).body).toEqual([]);
  });

  it("rollback creates a new version copying the old one; restore-draft leaves live alone; events recorded", async () => {
    const { ws, o, id, evaluate } = await setup();
    await ws(o.agent.post(`/api/policies/${id}/publish`)).send({}); // v1: gold → 15
    const v2 = sampleRuleSet();
    v2.rules[0].result.outcomes.discount = 20;
    await ws(o.agent.put(`/api/policies/${id}/draft`)).send({ ruleSet: v2 });
    await ws(o.agent.post(`/api/policies/${id}/publish`)).send({}); // v2: gold → 20
    expect((await evaluate(goldOrder))?.outcomes).toEqual({ discount: 20 });

    const rb = await ws(o.agent.post(`/api/policies/${id}/versions/1/rollback`)).send({ note: "Too generous" });
    expect(rb.body).toEqual({ version: 3 });
    expect((await evaluate(goldOrder))?.outcomes).toEqual({ discount: 15 });

    const restore = await ws(o.agent.post(`/api/policies/${id}/versions/2/restore-draft`)).send({});
    expect(restore.status).toBe(201);
    const got = (await ws(o.agent.get(`/api/policies/${id}`))).body;
    expect(got.draft.rules[0].result.outcomes.discount).toBe(20);
    expect(got.liveVersion.number).toBe(3);
    expect((await evaluate(goldOrder))?.outcomes).toEqual({ discount: 15 });

    const events = (await ws(o.agent.get(`/api/events?policyId=${id}`))).body.items;
    expect(events.map((e: { type: string }) => e.type)).toEqual(["ROLLED_BACK", "PUBLISHED", "PUBLISHED", "CREATED"]);
    expect(events[0]).toMatchObject({ fromVersion: 2, toVersion: 3 });
  });

  it("pause removes the policy from OPA and resume restores it", async () => {
    const { ws, o, id, evaluate } = await setup();
    await ws(o.agent.post(`/api/policies/${id}/publish`)).send({});
    expect((await ws(o.agent.post(`/api/policies/${id}/pause`)).send({})).status).toBe(201);
    expect(await evaluate(goldOrder)).toBeUndefined();
    expect((await ws(o.agent.get(`/api/policies/${id}`))).body.status).toBe("PAUSED");

    await ws(o.agent.post(`/api/policies/${id}/resume`)).send({});
    expect((await evaluate(goldOrder))?.allowed).toBe(true);
    expect((await ws(o.agent.get(`/api/policies/${id}`))).body.status).toBe("LIVE");
  });

  it("concurrent_publish: two publishes at once give v1 and v2, never a 500", async () => {
    const { ws, o, id } = await setup();
    const results = await Promise.all([1, 2].map(() => ws(o.agent.post(`/api/policies/${id}/publish`)).send({})));
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect(results.map((r) => r.body.version).sort()).toEqual([1, 2]);
  });
});
