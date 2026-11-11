import { BadRequestException, Body, Controller, Get, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { CurrentMember, CurrentUser, SignedIn, WorkspaceRoute } from "../auth/decorators.js";
import type { CurrentMember as Member, SessionUser } from "../auth/request-types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { DemoService } from "./demo.service.js";
import { TrafficSimulator } from "./traffic-simulator.service.js";

const ref = (m: Member) => ({ workspaceId: m.workspaceId, workspaceShortId: m.workspaceShortId, userId: m.userId });

@Controller("api/demo")
export class DemoController {
  constructor(
    private readonly demo: DemoService,
    private readonly traffic: TrafficSimulator,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @SignedIn()
  create(@CurrentUser() user: SessionUser) {
    return this.demo.create(user.id);
  }

  @Post("reset")
  @WorkspaceRoute("OWNER")
  reset(@CurrentMember() m: Member) {
    return this.demo.reset(ref(m));
  }

  @Get("traffic")
  @WorkspaceRoute("VIEWER")
  status(@CurrentMember() m: Member) {
    return this.traffic.status(m.workspaceId);
  }

  @Post("traffic")
  @WorkspaceRoute("OWNER")
  async toggle(@CurrentMember() m: Member, @Body() body: { on?: unknown }) {
    if (typeof body?.on !== "boolean") throw new BadRequestException("on must be true or false");
    const ws = await this.prisma.unscoped.workspace.findUnique({ where: { id: m.workspaceId } });
    if (!ws?.isDemo) throw new BadRequestException("Simulated traffic is only for demo workspaces");
    return body.on ? this.traffic.start({ workspaceId: m.workspaceId, workspaceShortId: m.workspaceShortId }) : this.traffic.stop(m.workspaceId);
  }

  /** Only when DEMO_PUBLIC=true; 404 otherwise. Sets the session cookie of the shared demo viewer. */
  @Post("public-login")
  async publicLogin(@Res({ passthrough: true }) res: Response) {
    const { workspaceId, headers } = await this.demo.publicLogin();
    const cookies = headers.getSetCookie();
    if (cookies.length) res.setHeader("Set-Cookie", cookies);
    return { workspaceId };
  }
}
