import { Controller, Get, Query } from "@nestjs/common";
import { WorkspaceRoute } from "../auth/decorators.js";
import { PrismaService } from "../prisma/prisma.service.js";

const PAGE = 50;

/** Change history for Activity → Changes. Cursor = id of the last item of the previous page. */
@Controller("api/events")
export class EventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @WorkspaceRoute("VIEWER")
  async list(@Query("policyId") policyId?: string, @Query("cursor") cursor?: string) {
    const rows = await this.prisma.scoped.policyEvent.findMany({
      where: policyId ? { policyId } : {},
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, PAGE);
    const users = await this.prisma.unscoped.user.findMany({
      where: { id: { in: [...new Set(page.map((e) => e.actorId))] } },
      select: { id: true, name: true },
    });
    const names = new Map(users.map((u) => [u.id, u.name]));
    return {
      items: page.map((e) => ({ ...e, actorName: names.get(e.actorId) ?? null })),
      nextCursor: rows.length > PAGE ? page[page.length - 1].id : null,
    };
  }
}
