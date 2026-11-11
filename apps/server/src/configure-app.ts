import type { INestApplication } from "@nestjs/common";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { AuthService } from "./auth/auth.service.js";
import { publicErrorBody } from "./decisions/public-error.js";

const BODY_LIMIT = "64kb";

/**
 * Wiring shared by main.ts and tests. Better Auth must see the raw body, so its handler is
 * mounted before the JSON parser (the app is created with bodyParser: false).
 */
export function configureApp(app: INestApplication) {
  const server = app.getHttpAdapter().getInstance() as express.Express;
  server.all("/api/auth/{*splat}", toNodeHandler(app.get(AuthService).auth));
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
  app.enableShutdownHooks();
}
