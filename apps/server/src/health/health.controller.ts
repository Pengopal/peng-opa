import { Controller, Get, HttpStatus, Inject, Res } from "@nestjs/common";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service.js";
import { OPA_GATEWAY, OpaGateway } from "../opa-gateway/opa-gateway.js";

type Status = "ok" | "down";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPA_GATEWAY) private readonly opa: OpaGateway,
  ) {}

  /** 200 when the database and OPA are both reachable, otherwise 503 with what is down. */
  @Get()
  async get(@Res() res: Response) {
    const [db, opa] = await Promise.all([this.dbStatus(), this.opa.health().then((ok): Status => (ok ? "ok" : "down"))]);
    const body = { app: "ok" as const, db, opa };
    res.status(db === "ok" && opa === "ok" ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(body);
  }

  private async dbStatus(): Promise<Status> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "ok";
    } catch {
      return "down";
    }
  }
}
