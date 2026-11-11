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
import { PublishingService } from "./policies/publishing.service.js";
import { VersionsController } from "./policies/versions.controller.js";
import { EventsController } from "./policies/events.controller.js";
import { DecideController } from "./decisions/decide.controller.js";
import { DecideService } from "./decisions/decide.service.js";
import { RateLimiter } from "./decisions/rate-limiter.js";
import { AUDIT_WRITER } from "./decisions/audit-writer.js";
import { DbAuditWriter } from "./decisions/db-audit-writer.service.js";
import { PlaygroundController } from "./decisions/playground.controller.js";
import { PlaygroundService } from "./decisions/playground.service.js";
import { DecisionsController } from "./decisions/decisions.controller.js";

@Module({
  imports: [ConfigModule, PrismaModule, OpaGatewayModule, AuthModule],
  controllers: [HealthController, WorkspacesController, MembersController, ApiKeysController, PoliciesController, VersionsController, EventsController, DecideController, PlaygroundController, DecisionsController],
  providers: [WorkspacesService, MembersService, Mailer, ApiKeysService, ApiKeyGuard, PoliciesService, PolicyEventsService, PublishingService, DecideService, RateLimiter, PlaygroundService, DbAuditWriter, { provide: AUDIT_WRITER, useExisting: DbAuditWriter }],
})
export class AppModule {}
