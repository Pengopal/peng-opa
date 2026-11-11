import { BadRequestException, Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post } from "@nestjs/common";
import { CurrentMember, WorkspaceRoute } from "../auth/decorators.js";
import type { CurrentMember as Member } from "../auth/request-types.js";
import { readString } from "../common/validate.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { PoliciesService } from "../policies/policies.service.js";
import { PlaygroundService } from "./playground.service.js";

@Controller("api/policies/:id")
export class PlaygroundController {
  constructor(
    private readonly playground: PlaygroundService,
    private readonly policies: PoliciesService,
    private readonly prisma: PrismaService,
  ) {}

  /** Any member may test; testing never changes the policy. */
  @Post("try")
  @WorkspaceRoute("VIEWER")
  try(@CurrentMember() m: Member, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    const target = body?.target ?? "draft";
    if (target !== "draft" && target !== "live") throw new BadRequestException('target must be "draft" or "live"');
    if (!body || !("input" in body)) throw new BadRequestException("input is required");
    return this.playground.try({ workspaceId: m.workspaceId, workspaceShortId: m.workspaceShortId, userId: m.userId }, id, body.input, target);
  }

  @Get("samples")
  @WorkspaceRoute("VIEWER")
  async samples(@Param("id") id: string) {
    await this.policies.find(id);
    return this.prisma.scoped.samplePayload.findMany({ where: { policyId: id }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, input: true } });
  }

  @Post("samples")
  @WorkspaceRoute("EDITOR")
  async addSample(@CurrentMember() m: Member, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    await this.policies.find(id);
    if (typeof body?.input !== "object" || body.input === null) throw new BadRequestException("input must be an object");
    const s = await this.prisma.scoped.samplePayload.create({
      data: { workspaceId: m.workspaceId, policyId: id, name: readString(body, "name", { max: 80 })!, input: body.input as object },
    });
    return { id: s.id, name: s.name, input: s.input };
  }

  @Delete("samples/:sampleId")
  @HttpCode(204)
  @WorkspaceRoute("EDITOR")
  async deleteSample(@Param("id") id: string, @Param("sampleId") sampleId: string) {
    const { count } = await this.prisma.scoped.samplePayload.deleteMany({ where: { id: sampleId, policyId: id } });
    if (!count) throw new NotFoundException("Sample not found");
  }
}
