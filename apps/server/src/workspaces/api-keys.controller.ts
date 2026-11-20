import { Body, Controller, Delete, Get, HttpCode, Param, Post } from "@nestjs/common";
import { CurrentMember, WorkspaceRoute } from "../auth/decorators.js";
import type { CurrentMember as Member } from "../auth/request-types.js";
import { readString } from "../common/validate.js";
import { ApiKeysService } from "./api-keys.service.js";
import { Track } from "../analytics/track.js";

@Controller("api/api-keys")
export class ApiKeysController {
  constructor(private readonly keys: ApiKeysService) {}

  @Post()
  @WorkspaceRoute("OWNER")
  @Track("api_key_created")
  create(@CurrentMember() member: Member, @Body() body: unknown) {
    return this.keys.create(member.workspaceId, readString(body, "name", { max: 80 })!);
  }

  @Get()
  @WorkspaceRoute("OWNER")
  list() {
    return this.keys.list();
  }

  @Delete(":id")
  @HttpCode(204)
  @WorkspaceRoute("OWNER")
  @Track("api_key_revoked")
  async revoke(@Param("id") id: string) {
    await this.keys.revoke(id);
  }
}
