import { Body, Controller, HttpCode, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiKeyGuard, ApiKeyRequest } from "./api-key.guard.js";
import { DecideService, DecideTarget } from "./decide.service.js";
import { PublicApiError } from "./public-error.js";
import { RateLimiter } from "./rate-limiter.js";

const MAX_BATCH = 100;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Public decision API. The workspace comes only from the API key; anything else in the body is ignored. */
@Controller("v1/decide")
@UseGuards(ApiKeyGuard)
export class DecideController {
  constructor(
    private readonly decisions: DecideService,
    private readonly limiter: RateLimiter,
  ) {}

  @Post(":policyKey")
  @HttpCode(200)
  async decide(@Req() req: ApiKeyRequest, @Param("policyKey") policyKey: string, @Body() body: unknown) {
    const target = this.target(req, 1);
    if (!isObject(body) || !("input" in body)) throw new PublicApiError("invalid_input", 'Send a JSON body like { "input": { … } }');
    return this.decisions.decide(target, policyKey, body.input, "API");
  }

  @Post(":policyKey/batch")
  @HttpCode(200)
  async batch(@Req() req: ApiKeyRequest, @Param("policyKey") policyKey: string, @Body() body: unknown) {
    const inputs = isObject(body) ? body.inputs : undefined;
    if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > MAX_BATCH) {
      throw new PublicApiError("invalid_input", `Send { "inputs": [ … ] } with 1–${MAX_BATCH} inputs`);
    }
    const target = this.target(req, 1);
    const policy = await this.decisions.livePolicy(target, policyKey);
    const results = [];
    for (const input of inputs) {
      try {
        const missing = this.decisions.checkInput(policy, input);
        results.push(await this.decisions.evaluate(target, policy, input, missing, "API"));
      } catch (e) {
        // Per-item input errors are reported in place; engine errors fail the whole batch.
        if (e instanceof PublicApiError && e.code === "invalid_input") results.push(e.getResponse());
        else throw e;
      }
    }
    return { results };
  }

  /** Rate limit counts HTTP requests: a batch call costs one token. */
  private target(req: ApiKeyRequest, tokens: number): DecideTarget {
    const key = req.apiKey!;
    if (!this.limiter.take(key.workspaceId, tokens)) {
      req.res?.setHeader("Retry-After", "1");
      throw new PublicApiError("rate_limited", "Too many requests for this workspace. Slow down and retry.");
    }
    return { workspaceId: key.workspaceId, workspaceShortId: key.workspaceShortId };
  }
}
