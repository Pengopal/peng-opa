import type { INestApplication } from "@nestjs/common";
import { sampleRuleSet } from "@peng/shared";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { startTestStack, TestStack } from "./support/stack.js";
import { createTestApp } from "./support/app.js";
import { signUpWithWorkspace } from "./support/users.js";

describe("policies CRUD and draft autosave", () => {
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

  it("enforces key format, uniqueness, and locks the key after the first publish", async () => {
    const o = await signUpWithWorkspace(app);
    const post = (body: object) => o.agent.post("/api/policies").set("x-workspace-id", o.workspaceId).send(body);

    expect((await post({ key: "Checkout Discount", name: "Checkout discount" })).status).toBe(422);
    const created = await post({ key: "checkout-discount", name: "Checkout discount" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ key: "checkout-discount", status: "DRAFT", liveVersion: null });
    expect((await post({ key: "checkout-discount", name: "Again" })).status).toBe(409);

    // Simulate a publish (Task 10 owns publishing) and try to rename the key.
    const prisma = app.get(PrismaService);
    const v = await prisma.unscoped.policyVersion.create({
      data: { workspaceId: o.workspaceId, policyId: created.body.id, number: 1, ruleSet: sampleRuleSet() as object, rego: "", publishedById: o.userId },
    });
    await prisma.unscoped.policy.update({ where: { id: created.body.id }, data: { liveVersionId: v.id, status: "LIVE" } });
    const rename = await o.agent.patch(`/api/policies/${created.body.id}`).set("x-workspace-id", o.workspaceId).send({ key: "new-key" });
    expect(rename.status).toBe(409);
  });

  it("saves a draft even with issues and returns them", async () => {
    const o = await signUpWithWorkspace(app);
    const created = await o.agent.post("/api/policies").set("x-workspace-id", o.workspaceId).send({ key: "refunds", name: "Refunds" });
    const draft = sampleRuleSet();
    draft.rules[0].conditions[0].value = "";

    const saved = await o.agent.put(`/api/policies/${created.body.id}/draft`).set("x-workspace-id", o.workspaceId).send({ ruleSet: draft });
    expect(saved.status).toBe(200);
    expect(saved.body.issues).toEqual([expect.objectContaining({ code: "empty_value", path: "rules[0].conditions[0].value" })]);

    const got = await o.agent.get(`/api/policies/${created.body.id}`).set("x-workspace-id", o.workspaceId);
    expect(got.body.draft).toEqual(draft);
    expect(got.body.issues).toHaveLength(1);

    const garbage = await o.agent.put(`/api/policies/${created.body.id}/draft`).set("x-workspace-id", o.workspaceId).send({ ruleSet: { rules: "nope" } });
    expect(garbage.status).toBe(400);
  });

  it("returns 404 for another workspace's policy", async () => {
    const a = await signUpWithWorkspace(app);
    const b = await signUpWithWorkspace(app);
    const p = await a.agent.post("/api/policies").set("x-workspace-id", a.workspaceId).send({ key: "secret", name: "Secret" });

    for (const req of [
      b.agent.get(`/api/policies/${p.body.id}`),
      b.agent.put(`/api/policies/${p.body.id}/draft`).send({ ruleSet: sampleRuleSet() }),
      b.agent.delete(`/api/policies/${p.body.id}`),
    ]) {
      expect((await req.set("x-workspace-id", b.workspaceId)).status).toBe(404);
    }
    expect((await b.agent.get("/api/policies").set("x-workspace-id", b.workspaceId)).body).toEqual([]);
  });
});
