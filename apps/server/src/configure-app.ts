import type { INestApplication } from "@nestjs/common";
import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { PUBLIC_DEMO_EMAIL, publicDemoMayDo } from "./demo/public-demo.js";
import { AuthService } from "./auth/auth.service.js";
import { publicErrorBody } from "./decisions/public-error.js";

const BODY_LIMIT = "64kb";
const WEB_DIST = join(import.meta.dirname, "..", "..", "web", "dist");
const API_PATHS = /^\/(api|v1|health)(\/|$)/;

/**
 * Wiring shared by main.ts and tests. Better Auth must see the raw body, so its handler is
 * mounted before the JSON parser (the app is created with bodyParser: false).
 */
export function configureApp(app: INestApplication) {
  const server = app.getHttpAdapter().getInstance() as express.Express;
  const auth = app.get(AuthService).auth;
  // The shared public-demo account may not change itself (rename, revoke everyone's sessions, …).
  server.all("/api/auth/{*splat}", async (req, res, next) => {
    if (publicDemoMayDo(req.method, req.path)) return next();
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) }).catch(() => null);
    if (session?.user.email === PUBLIC_DEMO_EMAIL) return res.status(403).json({ statusCode: 403, message: "The shared demo is read-only." });
    next();
  });
  server.all("/api/auth/{*splat}", toNodeHandler(auth));
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
  // Production: serve the built web app; unknown non-API paths get index.html for client-side routing.
  if (existsSync(join(WEB_DIST, "index.html"))) {
    server.use(express.static(WEB_DIST, { index: false, maxAge: "1h" }));
    server.get("{*splat}", (req, res, next) => (API_PATHS.test(req.path) ? next() : res.sendFile(join(WEB_DIST, "index.html"))));
  }
  app.enableShutdownHooks();
}
