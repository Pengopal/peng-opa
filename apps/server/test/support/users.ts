import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { randomBytes } from "node:crypto";

export interface TestUser {
  agent: ReturnType<typeof request.agent>;
  email: string;
  userId: string;
}

/** Sign up a fresh user through Better Auth; the returned agent carries the session cookie. */
export async function signUp(app: INestApplication, name = "Test User", email = `u-${randomBytes(4).toString("hex")}@example.test`): Promise<TestUser> {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post("/api/auth/sign-up/email").send({ name, email, password: "correct-horse-battery" });
  if (res.status !== 200) throw new Error(`sign-up failed ${res.status}: ${JSON.stringify(res.body)}`);
  return { agent, email, userId: res.body.user.id };
}

/** Sign up and create a workspace; returns the user plus the workspace id/shortId. */
export async function signUpWithWorkspace(app: INestApplication, name = "Acme") {
  const user = await signUp(app);
  const res = await user.agent.post("/api/workspaces").send({ name });
  if (res.status !== 201) throw new Error(`create workspace failed ${res.status}: ${JSON.stringify(res.body)}`);
  return { ...user, workspaceId: res.body.id as string, shortId: res.body.shortId as string };
}
