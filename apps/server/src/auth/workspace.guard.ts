import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { AppRequest, ROLE_RANK } from "./request-types.js";

export const MIN_ROLE = "minRole";

/**
 * Resolves the workspace from the x-workspace-id header and checks the caller is a member
 * with at least the route's role (403 otherwise). Sets req.member. Runs after SessionGuard.
 */
@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const workspaceId = req.header("x-workspace-id");
    if (!workspaceId || !req.user) throw new ForbiddenException("Choose a workspace");
    const member = await this.prisma.unscoped.member.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
      include: { workspace: { select: { shortId: true } } },
    });
    if (!member) throw new ForbiddenException("You are not a member of this workspace");
    const minRole = this.reflector.getAllAndOverride<Role | undefined>(MIN_ROLE, [ctx.getHandler(), ctx.getClass()]) ?? "VIEWER";
    if (ROLE_RANK[member.role] < ROLE_RANK[minRole]) {
      throw new ForbiddenException(`This needs the ${minRole.toLowerCase()} role`);
    }
    req.member = { workspaceId, workspaceShortId: member.workspace.shortId, userId: member.userId, role: member.role };
    return true;
  }
}
