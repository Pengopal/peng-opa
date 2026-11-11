import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Patch, Post } from "@nestjs/common";
import { CurrentMember, CurrentUser, SignedIn, WorkspaceRoute } from "../auth/decorators.js";
import type { CurrentMember as Member, SessionUser } from "../auth/request-types.js";
import { WorkspacesService } from "./workspaces.service.js";

function workspaceName(body: unknown): string {
  const name = (body as { name?: unknown })?.name;
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
    throw new BadRequestException("Workspace name must be 2–80 characters");
  }
  return name.trim();
}

@Controller("api/workspaces")
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post()
  @SignedIn()
  create(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    return this.workspaces.create(user.id, workspaceName(body));
  }

  @Get()
  @SignedIn()
  list(@CurrentUser() user: SessionUser) {
    return this.workspaces.listForUser(user.id);
  }

  @Patch("current")
  @WorkspaceRoute("OWNER")
  async rename(@CurrentMember() member: Member, @Body() body: unknown) {
    const ws = await this.workspaces.rename(member.workspaceId, workspaceName(body));
    return { id: ws.id, name: ws.name };
  }

  @Delete("current")
  @HttpCode(204)
  @WorkspaceRoute("OWNER")
  async remove(@CurrentMember() member: Member) {
    await this.workspaces.delete(member.workspaceId, member.workspaceShortId);
  }
}
