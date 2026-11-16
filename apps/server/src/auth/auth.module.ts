import { Global, Module } from "@nestjs/common";
import { AuthService, TENANTRY_KEYS } from "./auth.service.js";
import { SessionGuard } from "./session.guard.js";
import { WorkspaceGuard } from "./workspace.guard.js";

@Global()
@Module({ providers: [AuthService, SessionGuard, WorkspaceGuard, { provide: TENANTRY_KEYS, useValue: null }], exports: [AuthService, SessionGuard, WorkspaceGuard] })
export class AuthModule {}
