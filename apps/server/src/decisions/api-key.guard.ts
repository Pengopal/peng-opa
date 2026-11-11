import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ApiKeysService, ApiKeyIdentity } from "../workspaces/api-keys.service.js";
import type { AppRequest } from "../auth/request-types.js";

export interface ApiKeyRequest extends AppRequest {
  apiKey?: ApiKeyIdentity;
}

/** Public API auth: 401 invalid_api_key unless a live key is presented. Sets req.apiKey. */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly keys: ApiKeysService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<ApiKeyRequest>();
    const identity = await this.keys.authenticate(req.header("authorization"));
    if (!identity) {
      throw new HttpException(
        { error: { code: "invalid_api_key", message: "Send a valid API key as 'Authorization: Bearer pk_live_…'" } },
        HttpStatus.UNAUTHORIZED,
      );
    }
    req.apiKey = identity;
    return true;
  }
}
