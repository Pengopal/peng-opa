import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { configureApp } from "./configure-app.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureApp(app);
  await app.listen(Number(process.env.PORT ?? 3000));
}
void bootstrap();
