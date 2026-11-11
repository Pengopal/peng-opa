import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { from, lastValueFrom, Observable } from "rxjs";
import { runWithWorkspace } from "../prisma/request-context.js";
import type { AppRequest } from "./request-types.js";

/** Runs the handler inside runWithWorkspace so PrismaService.scoped is filtered to req.member's workspace. */
@Injectable()
export class WorkspaceContextInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const { member } = ctx.switchToHttp().getRequest<AppRequest>();
    if (!member) return next.handle();
    return from(runWithWorkspace(member.workspaceId, () => lastValueFrom(next.handle(), { defaultValue: undefined })));
  }
}
