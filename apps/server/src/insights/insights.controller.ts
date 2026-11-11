import { Controller, Get, Query } from "@nestjs/common";
import { WorkspaceRoute } from "../auth/decorators.js";
import { InsightsService } from "./insights.service.js";

const clampInt = (v: string | undefined, def: number, min: number, max: number) => {
  const n = Number(v ?? def);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : def;
};

@Controller("api/insights")
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get("summary")
  @WorkspaceRoute("VIEWER")
  summary() {
    return this.insights.summary();
  }

  @Get("daily")
  @WorkspaceRoute("VIEWER")
  daily(@Query("days") days?: string, @Query("policyId") policyId?: string) {
    return this.insights.daily(clampInt(days, 14, 1, 90), policyId);
  }

  @Get("recent")
  @WorkspaceRoute("VIEWER")
  recent(@Query("limit") limit?: string) {
    return this.insights.recent(clampInt(limit, 5, 1, 20));
  }
}
