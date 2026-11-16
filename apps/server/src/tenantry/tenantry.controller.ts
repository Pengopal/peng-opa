import { BadRequestException, Body, Controller, Get, Header, HttpCode, Inject, Logger, NotFoundException, Post, Req, UseGuards } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import { AuthService } from "../auth/auth.service.js";
import { SessionGuard } from "../auth/session.guard.js";
import { APP_CONFIG, AppConfig, TenantryConfig } from "../config/config.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { verifyLogoutToken } from "./tokens.js";

/** Sign in with Tenantry's server side (Tenantry ADR-0032). Answers 404 when Tenantry sign-in is off. */
@Controller("api/tenantry")
export class TenantryController {
  private readonly logger = new Logger(TenantryController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /**
   * Keycloak's back-channel logout: a signed logout token for a Keycloak session that has ended. Every
   * PengOPA session made from it ends too; sessions made with email or Google are never touched.
   */
  @Post("backchannel-logout")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  async backchannelLogout(@Body() body: Record<string, unknown> | undefined): Promise<Record<string, never>> {
    const tenantry = this.tenantry();
    const token = typeof body?.logout_token === "string" ? body.logout_token : undefined;
    let who: { sid?: string; sub?: string };
    try {
      if (!token) throw new Error("no logout_token");
      who = await verifyLogoutToken(token, this.authService.tenantryKeys!, tenantry);
    } catch (e) {
      // The reason goes to the log, never the token or the reason to the caller.
      this.logger.warn(`back-channel logout refused: ${(e as Error).message}`);
      throw new BadRequestException({ error: "invalid_request" });
    }
    const where = who.sid ? { sid: who.sid } : { sub: who.sub! };
    const linked = await this.prisma.unscoped.tenantrySession.findMany({ where, select: { sessionId: true } });
    if (linked.length > 0) {
      await this.prisma.unscoped.session.deleteMany({ where: { id: { in: linked.map((l) => l.sessionId) } } });
    }
    return {};
  }

  /** The workspace this session's Tenantry sign-in landed in, so the app opens it. */
  @Get("session")
  @UseGuards(SessionGuard)
  async session(@Req() req: Request): Promise<{ workspaceId: string | null }> {
    this.tenantry();
    const current = await this.authService.auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!current) return { workspaceId: null };
    const linked = await this.prisma.unscoped.tenantrySession.findUnique({ where: { sessionId: current.session.id } });
    return { workspaceId: linked?.workspaceId ?? null };
  }

  private tenantry(): TenantryConfig {
    if (!this.config.tenantry) throw new NotFoundException();
    return this.config.tenantry;
  }
}
