import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import { AuthService } from "./auth.service.js";
import type { AppRequest } from "./request-types.js";
import { PUBLIC_DEMO_EMAIL, publicDemoMayDo } from "../demo/public-demo.js";

/** 401 unless the request carries a valid Better Auth session. Sets req.user. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const session = await this.authService.auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) throw new UnauthorizedException();
    if (session.user.email === PUBLIC_DEMO_EMAIL && !publicDemoMayDo(req.method, req.path)) {
      throw new ForbiddenException("The shared demo is read-only. Create a free account to build your own policies.");
    }
    req.user = { id: session.user.id, email: session.user.email, name: session.user.name };
    return true;
  }
}
