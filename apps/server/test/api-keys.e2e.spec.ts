import type { INestApplication } from "@nestjs/common";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { ApiKeysService } from "../src/workspaces/api-keys.service.js";
import { startTestStack, TestStack } from "./support/stack.js";
import { createTestApp } from "./support/app.js";
import { signUpWithWorkspace } from "./support/users.js";

describe("API keys", () => {
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

  it("shows the key once and stores only its hash", async () => {
    const owner = await signUpWithWorkspace(app);
    const created = await owner.agent.post("/api/api-keys").set("x-workspace-id", owner.workspaceId).send({ name: "Checkout service" });
    expect(created.status).toBe(201);
    expect(created.body.key).toMatch(/^pk_live_[A-Za-z0-9]{32}$/);
    expect(created.body.prefix).toBe(created.body.key.slice(0, 12));

    const list = await owner.agent.get("/api/api-keys").set("x-workspace-id", owner.workspaceId);
    expect(list.body).toEqual([expect.objectContaining({ id: created.body.id, name: "Checkout service", prefix: created.body.prefix })]);
    expect(JSON.stringify(list.body)).not.toContain(created.body.key);

    const row = await app.get(PrismaService).unscoped.apiKey.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(JSON.stringify(row)).not.toContain(created.body.key);

    expect(await app.get(ApiKeysService).authenticate(`Bearer ${created.body.key}`)).toEqual({
      workspaceId: owner.workspaceId,
      workspaceShortId: owner.shortId,
      keyId: created.body.id,
    });
  });

  it("rejects revoked, unknown and malformed keys", async () => {
    const owner = await signUpWithWorkspace(app);
    const created = await owner.agent.post("/api/api-keys").set("x-workspace-id", owner.workspaceId).send({ name: "Old" });
    const revoke = await owner.agent.delete(`/api/api-keys/${created.body.id}`).set("x-workspace-id", owner.workspaceId);
    expect(revoke.status).toBe(204);

    const keys = app.get(ApiKeysService);
    for (const header of [`Bearer ${created.body.key}`, "Bearer pk_live_00000000000000000000000000000000", "Basic abc", "", undefined]) {
      expect(await keys.authenticate(header)).toBeNull();
    }
  });
});
