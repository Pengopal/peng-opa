import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { OpaGatewayModule } from "./opa-gateway/opa-gateway.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { HealthController } from "./health/health.controller.js";
import { WorkspacesController } from "./workspaces/workspaces.controller.js";
import { WorkspacesService } from "./workspaces/workspaces.service.js";

@Module({
  imports: [ConfigModule, PrismaModule, OpaGatewayModule, AuthModule],
  controllers: [HealthController, WorkspacesController],
  providers: [WorkspacesService],
})
export class AppModule {}
