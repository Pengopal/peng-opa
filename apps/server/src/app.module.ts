import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { OpaGatewayModule } from "./opa-gateway/opa-gateway.module.js";
import { HealthController } from "./health/health.controller.js";

@Module({
  imports: [ConfigModule, PrismaModule, OpaGatewayModule],
  controllers: [HealthController],
})
export class AppModule {}
