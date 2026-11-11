import type { INestApplication } from "@nestjs/common";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { AuthService } from "./auth/auth.service.js";

/**
 * Wiring shared by main.ts and tests. Better Auth must see the raw body, so its handler is
 * mounted before the JSON parser (the app is created with bodyParser: false).
 */
export function configureApp(app: INestApplication) {
  const server = app.getHttpAdapter().getInstance() as express.Express;
  server.all("/api/auth/{*splat}", toNodeHandler(app.get(AuthService).auth));
  app.use(express.json({ limit: "64kb" }));
  app.enableShutdownHooks();
}
