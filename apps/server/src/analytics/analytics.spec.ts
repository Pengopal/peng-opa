import express from "express";
import request from "supertest";
import { gzipSync } from "node:zlib";
import { of, lastValueFrom } from "rxjs";
import { Reflector } from "@nestjs/core";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { ingestRelay } from "./ingest-relay.js";
import { Analytics } from "./analytics.service.js";
import { Track, TrackInterceptor } from "./track.js";
import { authMethod } from "../auth/auth.service.js";
import { loadConfig } from "../config/config.js";
import { PUBLIC_DEMO_EMAIL } from "../demo/public-demo.js";

const KEY = "phc_test123";
const HOST = "https://eu.i.posthog.com";

function relay(key: string | undefined) {
  const sent: { url: string; body: Uint8Array }[] = [];
  const fakeFetch = (async (url: string, init: RequestInit) => {
    sent.push({ url, body: init.body as Uint8Array });
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  const app = express();
  app.use("/ingest", ingestRelay(key, HOST, fakeFetch));
  return { app, sent };
}

test("the relay passes this project's events to PostHog EU and nothing else", async () => {
  const { app, sent } = relay(KEY);
  const event = JSON.stringify({ api_key: KEY, event: "$pageview" });
  expect((await request(app).post("/ingest/e/?ver=1").set("content-type", "text/plain").send(event)).status).toBe(200);
  const gz = gzipSync(event);
  expect((await request(app).post("/ingest/i/v0/e/?compression=gzip-js").set("content-type", "text/plain").send(gz)).status).toBe(200);
  expect(sent.map((s) => s.url)).toEqual([`${HOST}/e/?ver=1`, `${HOST}/i/v0/e/?compression=gzip-js`]);

  // Another project's key, other endpoints, other methods, or too much: refused before reaching PostHog.
  expect((await request(app).post("/ingest/e/").send(JSON.stringify({ api_key: "phc_other" }))).status).toBe(403);
  expect((await request(app).post("/ingest/flags/?v=2").send(event)).status).toBe(404);
  expect((await request(app).get("/ingest/static/array.js")).status).toBe(404);
  expect((await request(app).post("/ingest/e/").set("content-type", "text/plain").send("x".repeat(1024 * 1024 + 10))).status).toBe(413);
  expect(sent).toHaveLength(2);
});

test("without a key the relay is not there", async () => {
  const { app, sent } = relay(undefined);
  expect((await request(app).post("/ingest/e/").send("{}")).status).toBe(404);
  expect(sent).toHaveLength(0);
});

test("@Track sends the event as the signed-in user after the route succeeds, and the demo stays anonymous", async () => {
  const captured: { event: string; distinct_id: string; properties: Record<string, unknown> }[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    captured.push(JSON.parse(init.body as string));
    return new Response("{}");
  }) as typeof fetch;
  try {
    const config = loadConfig({ DATABASE_URL: "x", BETTER_AUTH_SECRET: "s", APP_URL: "http://x", OPA_TOKEN: "t", POSTHOG_KEY: KEY });
    const interceptor = new TrackInterceptor(new Reflector(), new Analytics(config));
    class Routes {
      @Track("member_invited", (req) => ({ role: (req.body as { role: string }).role }))
      invite() {}
    }
    const run = async (user: { id: string; email: string }) => {
      const req = { user, member: { workspaceId: "ws1" }, body: { role: "EDITOR", email: "someone@example.com" } };
      const ctx = { getType: () => "http", getHandler: () => Routes.prototype.invite, switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
      await lastValueFrom(interceptor.intercept(ctx, { handle: () => of({}) } as CallHandler));
      await new Promise((r) => setTimeout(r, 0));
    };
    await run({ id: "u1", email: "owner@example.com" });
    await run({ id: "u2", email: PUBLIC_DEMO_EMAIL });

    expect(captured[0]).toMatchObject({ event: "member_invited", distinct_id: "u1", properties: { workspace_id: "ws1", role: "EDITOR", product: "pengopal-opa" } });
    expect(JSON.stringify(captured[0])).not.toContain("example.com");
    expect(captured[1]).toMatchObject({ distinct_id: "public-demo", properties: { demo: true, $process_person_profile: false } });
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("sign-up and sign-in methods come from Better Auth's endpoint", () => {
  expect(authMethod("/sign-up/email")).toBe("email");
  expect(authMethod("/callback/:id", { id: "google" })).toBe("google");
  expect(authMethod("/oauth2/callback/:providerId", { providerId: "tenantry" })).toBe("tenantry");
  expect(authMethod(undefined)).toBe("other");
});
