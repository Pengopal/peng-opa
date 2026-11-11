import "reflect-metadata";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { configureApp } from "./configure-app.js";

// Local runs read the repo-root .env; real environment variables win.
const envFile = join(import.meta.dirname, "..", "..", "..", ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureApp(app);
  await app.listen(Number(process.env.PORT ?? 3000));
}
void bootstrap();
