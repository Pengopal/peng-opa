import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { TENANTRY_KEYS } from "../src/auth/auth.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { linkTenantrySession } from "../src/tenantry/tenantry-sign-in.js";
import { linkWorkspace } from "../src/tenantry/link-workspace.js";
import { BACKCHANNEL_LOGOUT_EVENT } from "../src/tenantry/tokens.js";
import { createTestApp } from "./support/app.js";
import { startTestStack, TestStack } from "./support/stack.js";
import { signUp, signUpWithWorkspace, type TestUser } from "./support/users.js";

const ISSUER = "http://auth.tenantry.localhost:8080/realms/platform";
const TENANTRY_ENV = {
  TENANTRY_ISSUER: ISSUER,
  TENANTRY_INTERNAL_URL: "http://127.0.0.1:8180",
  TENANTRY_CLIENT_ID: "pengopa",
  TENANTRY_CLIENT_SECRET: "test-pengopa-secret",
};

type Sign = (claims: Record<string, unknown>, opts?: { audience?: string; issuer?: string; iat?: number }) => Promise<string>;

async function signer(kid: string): Promise<{ jwk: JWK; sign: Sign }> {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid, alg: "RS256", use: "sig" };
  const sign: Sign = (claims, opts = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid })
      .setIssuer(opts.issuer ?? ISSUER)
      .setAudience(opts.audience ?? "pengopa")
      .setIssuedAt(opts.iat ?? Math.floor(Date.now() / 1000))
      .setExpirationTime("10m")
      .sign(privateKey);
  return { jwk, sign };
}

describe("Sign in with Tenantry", () => {
  let stack: TestStack;
  let app: INestApplication;
  let prisma: PrismaService;
  let sign: Sign;
  let signWithOtherKey: Sign;

  beforeAll(async () => {
    const realm = await signer("realm");
    const other = await signer("other");
    sign = realm.sign;
    signWithOtherKey = other.sign;
    stack = await startTestStack();
    app = await createTestApp(stack, TENANTRY_ENV, [{ provide: TENANTRY_KEYS, useValue: createLocalJWKSet({ keys: [realm.jwk] }) }]);
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    await app?.close();
    await stack?.stop();
    for (const key of Object.keys(TENANTRY_ENV)) delete process.env[key];
  });

  const sessionsOf = (userId: string) => prisma.unscoped.session.findMany({ where: { userId } });

  /** A signed-in person whose current session came from Tenantry, as the callback hook leaves it. */
  async function tenantryUser(sub: string, sid: string | undefined, groups = ["/owners"], alias = `org-${sub}`) {
    const user = await signUp(app);
    const [session] = await sessionsOf(user.userId);
    const linked = await linkTenantrySession(prisma.unscoped, {
      sessionId: session!.id,
      userId: user.userId,
      claims: { sub, ...(sid ? { sid } : {}), organization: { [alias]: { groups } } },
    });
    return { ...user, sessionId: session!.id, workspaceId: linked.workspaceId };
  }

  const logoutToken = (claims: Record<string, unknown>) => ({ events: { [BACKCHANNEL_LOGOUT_EVENT]: {} }, jti: randomUUID(), ...claims });
  const backchannel = (token?: string) =>
    request(app.getHttpServer())
      .post("/api/tenantry/backchannel-logout")
      .type("form")
      .send(token ? { logout_token: token } : {});
  const signedIn = async (user: TestUser) => (await user.agent.get("/api/workspaces")).status === 200;

  it("config_says_tenantry_is_on", async () => {
    const res = await request(app.getHttpServer()).get("/api/config");
    expect(res.body.tenantryEnabled).toBe(true);
  });

  it("first_sign_in_makes_the_linked_workspace_and_later_ones_follow_the_tenantry_role", async () => {
    const alias = `pengopal-${randomUUID().slice(0, 6)}`;
    const a = await tenantryUser("kc-a", "s-a", ["/owners"], alias);
    const ws = await prisma.unscoped.workspace.findUniqueOrThrow({ where: { tenantryOrg: alias } });
    expect(ws.id).toBe(a.workspaceId);
    expect(ws.name).toBe(alias.charAt(0).toUpperCase() + alias.slice(1).replace("-", " "));
    const b = await tenantryUser("kc-b", "s-b", ["/members"], alias);
    expect(b.workspaceId).toBe(ws.id);
    const role = async (userId: string) =>
      (await prisma.unscoped.member.findUniqueOrThrow({ where: { workspaceId_userId: { workspaceId: ws.id, userId } } })).role;
    expect(await role(b.userId)).toBe("VIEWER");

    await prisma.unscoped.tenantrySession.delete({ where: { sessionId: b.sessionId } });
    await linkTenantrySession(prisma.unscoped, {
      sessionId: b.sessionId,
      userId: b.userId,
      claims: { sub: "kc-b", organization: { [alias]: { groups: ["/admins"] } } },
    });
    expect(await role(b.userId)).toBe("EDITOR");
    expect(await role(a.userId)).toBe("OWNER");
  });

  it("a_sign_in_without_a_workspace_still_links_the_session", async () => {
    const user = await signUp(app);
    const [session] = await sessionsOf(user.userId);
    const linked = await linkTenantrySession(prisma.unscoped, { sessionId: session!.id, userId: user.userId, claims: { sub: "kc-none", sid: "s-none" } });
    expect(linked.workspaceId).toBeNull();
    expect(await prisma.unscoped.tenantrySession.findUnique({ where: { sessionId: session!.id } })).toMatchObject({ sid: "s-none", sub: "kc-none" });
  });

  it("link_script_points_a_tenantry_workspace_at_an_existing_one", async () => {
    const owner = await signUpWithWorkspace(app, "Pengopal");
    const ws = await prisma.unscoped.workspace.findUniqueOrThrow({ where: { id: owner.workspaceId } });
    const alias = `linked-${randomUUID().slice(0, 6)}`;
    expect(await linkWorkspace(prisma.unscoped, ws.slug, alias)).toEqual({ id: ws.id, name: "Pengopal" });
    const member = await tenantryUser("kc-linked", "s-linked", ["/members"], alias);
    expect(member.workspaceId).toBe(ws.id);

    const other = await signUpWithWorkspace(app, "Other");
    const otherWs = await prisma.unscoped.workspace.findUniqueOrThrow({ where: { id: other.workspaceId } });
    await expect(linkWorkspace(prisma.unscoped, otherWs.slug, alias)).rejects.toThrow(/already linked/);
    await expect(linkWorkspace(prisma.unscoped, "no-such-workspace", `x-${alias}`)).rejects.toThrow(/No workspace/);
  });

  it("session_names_the_workspace_the_sign_in_landed_in", async () => {
    const a = await tenantryUser("kc-ws", "s-ws");
    const res = await a.agent.get("/api/tenantry/session");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ workspaceId: a.workspaceId });
  });

  it("backchannel_by_sid_ends_only_that_keycloak_session", async () => {
    const a = await tenantryUser("kc-sid-a", "s-sid-a");
    const b = await tenantryUser("kc-sid-b", "s-sid-b");
    const res = await backchannel(await sign(logoutToken({ sub: "kc-sid-a", sid: "s-sid-a" })));
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(await signedIn(a)).toBe(false);
    expect(await signedIn(b)).toBe(true);
  });

  it("backchannel_by_sub_ends_every_tenantry_session_but_not_an_email_one", async () => {
    const a = await tenantryUser("kc-sub", undefined);
    const emailAgent = request.agent(app.getHttpServer());
    const login = await emailAgent.post("/api/auth/sign-in/email").send({ email: a.email, password: "correct-horse-battery" });
    expect(login.status).toBe(200);
    const res = await backchannel(await sign(logoutToken({ sub: "kc-sub" })));
    expect(res.status).toBe(200);
    expect(await signedIn(a)).toBe(false);
    expect((await emailAgent.get("/api/workspaces")).status).toBe(200);
  });

  it.each<[string, () => Promise<string | undefined>]>([
    ["no token", async () => undefined],
    ["another audience", async () => sign(logoutToken({ sub: "kc-bad", sid: "s-bad" }), { audience: "someone-else" })],
    ["another issuer", async () => sign(logoutToken({ sub: "kc-bad", sid: "s-bad" }), { issuer: "https://evil.test/realms/platform" })],
    ["an old token", async () => sign(logoutToken({ sub: "kc-bad", sid: "s-bad" }), { iat: Math.floor(Date.now() / 1000) - 600 })],
    ["a nonce", async () => sign(logoutToken({ sub: "kc-bad", sid: "s-bad", nonce: "n" }))],
    ["no logout event", async () => sign({ sub: "kc-bad", sid: "s-bad", events: {} })],
    ["another key", async () => signWithOtherKey(logoutToken({ sub: "kc-bad", sid: "s-bad" }))],
    ["a token that is not a JWT", async () => "not-a-jwt"],
  ])("backchannel_refuses_%s_and_ends_nothing", async (_name, make) => {
    const victim = await tenantryUser(`kc-bad-${randomUUID().slice(0, 8)}`, "s-bad");
    const res = await backchannel(await make());
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid_request" });
    expect(await signedIn(victim)).toBe(true);
    await prisma.unscoped.session.deleteMany({ where: { userId: victim.userId } });
  });
});

describe("Tenantry sign-in off", () => {
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

  it("has no button and no endpoints", async () => {
    expect((await request(app.getHttpServer()).get("/api/config")).body.tenantryEnabled).toBe(false);
    const res = await request(app.getHttpServer()).post("/api/tenantry/backchannel-logout").type("form").send({ logout_token: "x" });
    expect(res.status).toBe(404);
  });
});
