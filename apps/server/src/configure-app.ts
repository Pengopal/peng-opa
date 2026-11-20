import type { INestApplication } from "@nestjs/common";
import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { PUBLIC_DEMO_EMAIL, publicDemoMayDo } from "./demo/public-demo.js";
import { AuthService } from "./auth/auth.service.js";
import { publicErrorBody } from "./decisions/public-error.js";
import { serveWebApp, useSecurityHeaders } from "./web/web-security.js";
import { APP_CONFIG, type AppConfig } from "./config/config.js";
import { ingestRelay } from "./analytics/ingest-relay.js";

const BODY_LIMIT = "64kb";
const WEB_DIST = join(import.meta.dirname, "..", "..", "web", "dist");
const API_PATHS = /^\/(api|v1|health|ingest)(\/|$)/;

/**
 * Wiring shared by main.ts and tests. Better Auth must see the raw body, so its handler is
 * mounted before the JSON parser (the app is created with bodyParser: false).
 */
export function configureApp(app: INestApplication) {
  const server = app.getHttpAdapter().getInstance() as express.Express;
  const auth = app.get(AuthService).auth;
  useSecurityHeaders(server);
  // Browser analytics reach PostHog through this origin (analytics/ingest-relay.ts); raw bodies, so before the JSON parser.
  const config = app.get<AppConfig>(APP_CONFIG);
  server.use("/ingest", ingestRelay(config.posthogKey, config.posthogHost));
  // The shared public-demo account may not change itself (rename, revoke everyone's sessions, …).
  server.all("/api/auth/{*splat}", async (req, res, next) => {
    if (publicDemoMayDo(req.method, req.path)) return next();
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) }).catch(() => null);
    if (session?.user.email === PUBLIC_DEMO_EMAIL) return res.status(403).json({ statusCode: 403, message: "The shared demo is read-only." });
    next();
  });
  server.all("/api/auth/{*splat}", toNodeHandler(auth));
  // Keycloak posts back-channel logout tokens as a form (OpenID Connect Back-Channel Logout 1.0).
  app.use("/api/tenantry/backchannel-logout", express.urlencoded({ extended: false, limit: "16kb" }));
  app.use(express.json({ limit: BODY_LIMIT }));
  // Body-parser failures happen before Nest; give them the same error shape as everything else.
  app.use((err: { type?: string; status?: number }, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!err) return next();
    const isPublic = req.path.startsWith("/v1/");
    if (err.type === "entity.too.large") {
      const e = publicErrorBody("payload_too_large", `Request body must be at most ${BODY_LIMIT}`);
      return res.status(e.status).json(isPublic ? e.body : { statusCode: 413, message: e.body.error.message });
    }
    if (err.type === "entity.parse.failed") {
      const e = publicErrorBody("invalid_json", "Request body is not valid JSON");
      return res.status(e.status).json(isPublic ? e.body : { statusCode: 400, message: e.body.error.message });
    }
    return next(err);
  });
  // Production: serve the built web app (web/web-security.ts).
  if (existsSync(join(WEB_DIST, "index.html"))) serveWebApp(server, WEB_DIST, API_PATHS);
  app.enableShutdownHooks();
}
