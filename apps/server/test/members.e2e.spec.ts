import type { INestApplication } from "@nestjs/common";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { startTestStack, TestStack } from "./support/stack.js";
import { createTestApp } from "./support/app.js";
import { signUp, signUpWithWorkspace } from "./support/users.js";

describe("members and invites", () => {
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

  const tokenOf = (inviteUrl: string) => inviteUrl.split("/").pop()!;

  it("invite_accept_creates_member (and accepting twice is harmless)", async () => {
    const owner = await signUpWithWorkspace(app);
    const email = `invitee-${Date.now()}@example.test`;
    const inv = await owner.agent.post("/api/invites").set("x-workspace-id", owner.workspaceId).send({ email, role: "EDITOR" });
    expect(inv.status).toBe(201);
    expect(inv.body.inviteUrl).toMatch(/^http:\/\/localhost:3000\/invite\/[A-Za-z0-9_-]{20,}$/);

    // Someone else holding the link cannot use it.
    const stranger = await signUp(app);
    expect((await stranger.agent.post("/api/invites/accept").send({ token: tokenOf(inv.body.inviteUrl) })).status).toBe(403);

    const invitee = await signUp(app, "Invitee", email.toUpperCase());
    for (let i = 0; i < 2; i++) {
      const acc = await invitee.agent.post("/api/invites/accept").send({ token: tokenOf(inv.body.inviteUrl) });
      expect(acc.status).toBe(201);
      expect(acc.body).toEqual({ workspaceId: owner.workspaceId });
    }
    const members = await owner.agent.get("/api/members").set("x-workspace-id", owner.workspaceId);
    expect(members.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: invitee.userId, role: "EDITOR", email })]),
    );
    expect(members.body).toHaveLength(2);
  });

  it("expired_invite_rejected", async () => {
    const owner = await signUpWithWorkspace(app);
    const email = `late-${Date.now()}@example.test`;
    const inv = await owner.agent.post("/api/invites").set("x-workspace-id", owner.workspaceId).send({ email, role: "VIEWER" });
    await prisma.unscoped.invite.update({ where: { id: inv.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const invitee = await signUp(app, "Late", email);
    const acc = await invitee.agent.post("/api/invites/accept").send({ token: tokenOf(inv.body.inviteUrl) });
    expect(acc.status).toBe(410);
  });

  it("never_removes_or_demotes_the_last_owner", async () => {
    const owner = await signUpWithWorkspace(app);
    const me = (await owner.agent.get("/api/members").set("x-workspace-id", owner.workspaceId)).body[0];

    const demote = await owner.agent.patch(`/api/members/${me.id}`).set("x-workspace-id", owner.workspaceId).send({ role: "EDITOR" });
    expect(demote.status).toBe(409);
    const remove = await owner.agent.delete(`/api/members/${me.id}`).set("x-workspace-id", owner.workspaceId);
    expect(remove.status).toBe(409);
  });
});
