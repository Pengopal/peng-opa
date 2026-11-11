import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { OpaGatewayModule } from "./opa-gateway/opa-gateway.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { HealthController } from "./health/health.controller.js";
import { WorkspacesController } from "./workspaces/workspaces.controller.js";
import { WorkspacesService } from "./workspaces/workspaces.service.js";
import { MembersController } from "./workspaces/members.controller.js";
import { MembersService } from "./workspaces/members.service.js";
import { Mailer } from "./workspaces/mailer.js";
import { ApiKeysController } from "./workspaces/api-keys.controller.js";
import { ApiKeysService } from "./workspaces/api-keys.service.js";
import { ApiKeyGuard } from "./decisions/api-key.guard.js";
import { PoliciesController } from "./policies/policies.controller.js";
import { PoliciesService } from "./policies/policies.service.js";
import { PolicyEventsService } from "./policies/policy-events.service.js";

@Module({
  imports: [ConfigModule, PrismaModule, OpaGatewayModule, AuthModule],
  controllers: [HealthController, WorkspacesController, MembersController, ApiKeysController, PoliciesController],
  providers: [WorkspacesService, MembersService, Mailer, ApiKeysService, ApiKeyGuard, PoliciesService, PolicyEventsService],
})
export class AppModule {}
