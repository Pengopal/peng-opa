import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { CurrentMember, CurrentUser, SignedIn, WorkspaceRoute } from "../auth/decorators.js";
import type { CurrentMember as Member, SessionUser } from "../auth/request-types.js";
import { readEmail, readRole, readString } from "../common/validate.js";
import { MembersService } from "./members.service.js";
import { Track } from "../analytics/track.js";

@Controller("api")
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get("members")
  @WorkspaceRoute("VIEWER")
  list() {
    return this.members.list();
  }

  @Patch("members/:id")
  @WorkspaceRoute("OWNER")
  @Track("member_role_changed", (req) => ({ role: (req.body as { role?: string }).role }))
  changeRole(@Param("id") id: string, @Body() body: unknown) {
    return this.members.changeRole(id, readRole(body));
  }

  @Delete("members/:id")
  @HttpCode(204)
  @WorkspaceRoute("OWNER")
  @Track("member_removed")
  async remove(@Param("id") id: string) {
    await this.members.remove(id);
  }

  @Post("invites")
  @WorkspaceRoute("OWNER")
  @Track("member_invited", (req) => ({ role: (req.body as { role?: string }).role }))
  invite(@CurrentMember() member: Member, @Body() body: unknown) {
    return this.members.invite(member.workspaceId, readEmail(body), readRole(body));
  }

  @Get("invites")
  @WorkspaceRoute("OWNER")
  pending() {
    return this.members.pendingInvites();
  }

  @Delete("invites/:id")
  @HttpCode(204)
  @WorkspaceRoute("OWNER")
  async revoke(@Param("id") id: string) {
    await this.members.revokeInvite(id);
  }

  @Post("invites/accept")
  @SignedIn()
  @Track("invite_accepted", (_req, result) => ({ workspace_id: (result as { workspaceId?: string })?.workspaceId }))
  accept(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    return this.members.accept(user, readString(body, "token", { max: 200 })!);
  }
}
