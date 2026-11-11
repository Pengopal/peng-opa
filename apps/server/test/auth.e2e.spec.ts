import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { OPA_GATEWAY, OpaGateway } from "../src/opa-gateway/opa-gateway.js";
import { startTestStack, TestStack } from "./support/stack.js";
import { createTestApp } from "./support/app.js";
import { signUp, signUpWithWorkspace } from "./support/users.js";

describe("auth, workspaces and role guards", () => {
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

  it("signup_then_create_workspace_makes_owner", async () => {
    const { agent, workspaceId } = await signUpWithWorkspace(app, "Acme Retail");
    const res = await agent.get("/api/workspaces");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([expect.objectContaining({ id: workspaceId, name: "Acme Retail", role: "OWNER", isDemo: false })]);
  });

  it("no_session_401", async () => {
    expect((await request(app.getHttpServer()).get("/api/workspaces")).status).toBe(401);
  });

  it("non_member_header_403", async () => {
    const owner = await signUpWithWorkspace(app);
    const stranger = await signUp(app);
    const res = await stranger.agent.patch("/api/workspaces/current").set("x-workspace-id", owner.workspaceId).send({ name: "Mine now" });
    expect(res.status).toBe(403);
  });

  it("viewer_blocked_from_owner_route_403", async () => {
    const owner = await signUpWithWorkspace(app);
    const viewer = await signUp(app);
    await prisma.unscoped.member.create({ data: { workspaceId: owner.workspaceId, userId: viewer.userId, role: "VIEWER" } });
    const res = await viewer.agent.patch("/api/workspaces/current").set("x-workspace-id", owner.workspaceId).send({ name: "Renamed" });
    expect(res.status).toBe(403);
  });

  it("delete_workspace_removes_its_opa_policies", async () => {
    const owner = await signUpWithWorkspace(app);
    const opa = app.get<OpaGateway>(OPA_GATEWAY);
    const prefix = `t_${owner.shortId}/`;
    await opa.upsertPolicy(`${prefix}p`, `package t_${owner.shortId}.p\nimport rego.v1\nx := 1\n`);

    const res = await owner.agent.delete("/api/workspaces/current").set("x-workspace-id", owner.workspaceId);
    expect(res.status).toBe(204);
    expect(await opa.listPolicyIds(prefix)).toEqual([]);
    expect(await prisma.unscoped.workspace.findUnique({ where: { id: owner.workspaceId } })).toBeNull();
  });
});
