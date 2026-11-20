import express from "express";
import request from "supertest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { serveWebApp, useSecurityHeaders } from "./web-security.js";

function app() {
  const dist = mkdtempSync(join(tmpdir(), "web-"));
  writeFileSync(join(dist, "index.html"), "<html>app</html>");
  writeFileSync(join(dist, "robots.txt"), "User-agent: *");
  const server = express();
  useSecurityHeaders(server);
  serveWebApp(server, dist, /^\/(api|v1|health)(\/|$)/);
  return server;
}

test("pages get the app, with security headers and without naming Express", async () => {
  const res = await request(app()).get("/policies/abc");
  expect(res.status).toBe(200);
  expect(res.text).toBe("<html>app</html>");
  expect(res.headers["x-powered-by"]).toBeUndefined();
  expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(res.headers["strict-transport-security"]).toContain("max-age=31536000");
});

test("scanners asking for secrets and server files get a 404, not the app", async () => {
  for (const path of ["/.env", "/portal/.env", "/.git/config", "/wp-login.php", "/service-account.json", "/assets/missing.js"]) {
    const res = await request(app()).get(path);
    expect(res.status, path).toBe(404);
    expect(res.text).not.toContain("app");
  }
  expect((await request(app()).get("/robots.txt")).status).toBe(200);
});
