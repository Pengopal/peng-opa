import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { startTestStack, TestStack } from "./support/stack.js";
import { createTestApp } from "./support/app.js";

describe("GET /health", () => {
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

  it("returns ok for app, db and opa", async () => {
    const res = await request(app.getHttpServer()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ app: "ok", db: "ok", opa: "ok" });
  });

  it("returns opa: down with 503 when OPA is stopped", async () => {
    await stack.killOpa();
    try {
      const res = await request(app.getHttpServer()).get("/health");
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ app: "ok", db: "ok", opa: "down" });
    } finally {
      await stack.startOpa();
    }
  });
});
