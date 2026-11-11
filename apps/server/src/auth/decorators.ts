import { applyDecorators, createParamDecorator, ExecutionContext, SetMetadata, UseGuards, UseInterceptors } from "@nestjs/common";
import type { Role } from "../generated/prisma/client.js";
import { SessionGuard } from "./session.guard.js";
import { MIN_ROLE, WorkspaceGuard } from "./workspace.guard.js";
import { WorkspaceContextInterceptor } from "./workspace-context.interceptor.js";
import type { AppRequest } from "./request-types.js";

/** Signed-in user; no workspace needed. */
export const SignedIn = () => UseGuards(SessionGuard);

/** Signed-in member of the x-workspace-id workspace with at least `minRole`; the handler runs in its context. */
export const WorkspaceRoute = (minRole: Role = "VIEWER") =>
  applyDecorators(SetMetadata(MIN_ROLE, minRole), UseGuards(SessionGuard, WorkspaceGuard), UseInterceptors(WorkspaceContextInterceptor));

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AppRequest>().user!);
export const CurrentMember = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AppRequest>().member!);
