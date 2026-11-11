import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../src/app.module.js";
import { TestStack } from "./stack.js";

/** Boot the real Nest app against a test stack. Env overrides apply before module init. */
export async function createTestApp(stack: TestStack, env: Record<string, string> = {}): Promise<INestApplication> {
  Object.assign(process.env, {
    DATABASE_URL: stack.databaseUrl,
    OPA_URL: stack.opaUrl,
    OPA_TOKEN: stack.opaToken,
    BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
    APP_URL: "http://localhost:3000",
    ...env,
  });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();
  return app;
}
