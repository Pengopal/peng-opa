import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import { AuthService } from "./auth.service.js";
import type { AppRequest } from "./request-types.js";

/** 401 unless the request carries a valid Better Auth session. Sets req.user. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const session = await this.authService.auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) throw new UnauthorizedException();
    req.user = { id: session.user.id, email: session.user.email, name: session.user.name };
    return true;
  }
}
