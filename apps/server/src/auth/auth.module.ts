import { Global, Module } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { SessionGuard } from "./session.guard.js";
import { WorkspaceGuard } from "./workspace.guard.js";

@Global()
@Module({ providers: [AuthService, SessionGuard, WorkspaceGuard], exports: [AuthService, SessionGuard, WorkspaceGuard] })
export class AuthModule {}
