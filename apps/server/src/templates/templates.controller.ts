import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentMember, WorkspaceRoute } from "../auth/decorators.js";
import type { CurrentMember as Member } from "../auth/request-types.js";
import { readString } from "../common/validate.js";
import { TemplatesService } from "./templates.service.js";

@Controller("api/templates")
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  @WorkspaceRoute("VIEWER")
  list() {
    return this.templates.list();
  }

  @Post(":id/use")
  @WorkspaceRoute("EDITOR")
  use(@CurrentMember() m: Member, @Param("id") id: string, @Body() body: unknown) {
    return this.templates.use({ workspaceId: m.workspaceId, workspaceShortId: m.workspaceShortId, userId: m.userId }, id, {
      key: readString(body, "key", { max: 60, optional: true }),
      name: readString(body, "name", { max: 120, optional: true }),
    });
  }
}
