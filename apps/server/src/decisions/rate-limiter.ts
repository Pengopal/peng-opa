import { Inject, Injectable } from "@nestjs/common";
import { APP_CONFIG, AppConfig } from "../config/config.js";

interface Bucket {
  tokens: number;
  at: number;
}

/** In-memory token bucket per workspace: capacity and refill rate = RATE_LIMIT_RPS. */
@Injectable()
export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly rate: number;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.rate = Math.max(1, config.rateLimitRps);
  }

  /** Take `n` tokens; false (and nothing taken) when the workspace is over its limit. */
  take(workspaceId: string, n = 1): boolean {
    const now = Date.now();
    const b = this.buckets.get(workspaceId) ?? { tokens: this.rate, at: now };
    b.tokens = Math.min(this.rate, b.tokens + ((now - b.at) / 1000) * this.rate);
    b.at = now;
    this.buckets.set(workspaceId, b);
    if (b.tokens < n) return false;
    b.tokens -= n;
    return true;
  }
}
