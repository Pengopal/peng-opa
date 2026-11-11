import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from "@nestjs/common";
import { CurrentMember, WorkspaceRoute } from "../auth/decorators.js";
import type { CurrentMember as Member } from "../auth/request-types.js";
import { readString } from "../common/validate.js";
import { parseRuleSet } from "./parse-ruleset.js";
import { PoliciesService, WorkspaceRef } from "./policies.service.js";

const ref = (m: Member): WorkspaceRef => ({ workspaceId: m.workspaceId, workspaceShortId: m.workspaceShortId, userId: m.userId });

@Controller("api/policies")
export class PoliciesController {
  constructor(private readonly policies: PoliciesService) {}

  @Get()
  @WorkspaceRoute("VIEWER")
  list() {
    return this.policies.list();
  }

  @Post()
  @WorkspaceRoute("EDITOR")
  create(@CurrentMember() member: Member, @Body() body: Record<string, unknown>) {
    return this.policies.create(ref(member), {
      key: readString(body, "key", { max: 60 })!,
      name: readString(body, "name", { max: 120 })!,
      description: readString(body, "description", { max: 2000, optional: true }),
      ruleSet: body?.ruleSet === undefined ? undefined : parseRuleSet(body.ruleSet),
    });
  }

  @Get(":id")
  @WorkspaceRoute("VIEWER")
  get(@Param("id") id: string) {
    return this.policies.get(id);
  }

  @Patch(":id")
  @WorkspaceRoute("EDITOR")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.policies.update(id, {
      name: readString(body, "name", { max: 120, optional: true }),
      description: body?.description === null ? null : readString(body, "description", { max: 2000, optional: true }),
      key: readString(body, "key", { max: 60, optional: true }),
    });
  }

  @Put(":id/draft")
  @WorkspaceRoute("EDITOR")
  saveDraft(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.policies.saveDraft(id, parseRuleSet(body?.ruleSet));
  }

  @Delete(":id")
  @HttpCode(204)
  @WorkspaceRoute("EDITOR")
  async remove(@CurrentMember() member: Member, @Param("id") id: string) {
    await this.policies.delete(ref(member), id);
  }
}
