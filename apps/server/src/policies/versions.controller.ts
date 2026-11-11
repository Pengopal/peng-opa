import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { CurrentMember, WorkspaceRoute } from "../auth/decorators.js";
import type { CurrentMember as Member } from "../auth/request-types.js";
import { readString } from "../common/validate.js";
import { PublishingService } from "./publishing.service.js";
import type { WorkspaceRef } from "./policies.service.js";

const ref = (m: Member): WorkspaceRef => ({ workspaceId: m.workspaceId, workspaceShortId: m.workspaceShortId, userId: m.userId });
const note = (body: unknown) => readString(body, "note", { max: 500, optional: true });

@Controller("api/policies/:id")
export class VersionsController {
  constructor(private readonly publishing: PublishingService) {}

  @Get("publish-preview")
  @WorkspaceRoute("EDITOR")
  preview(@Param("id") id: string) {
    return this.publishing.preview(id);
  }

  @Post("publish")
  @WorkspaceRoute("EDITOR")
  publish(@CurrentMember() m: Member, @Param("id") id: string, @Body() body: unknown) {
    return this.publishing.publishDraft(ref(m), id, note(body));
  }

  @Get("versions")
  @WorkspaceRoute("VIEWER")
  versions(@Param("id") id: string) {
    return this.publishing.versions(id);
  }

  @Get("versions/:n")
  @WorkspaceRoute("VIEWER")
  version(@Param("id") id: string, @Param("n", ParseIntPipe) n: number) {
    return this.publishing.versionDetail(id, n);
  }

  @Post("versions/:n/restore-draft")
  @WorkspaceRoute("EDITOR")
  restore(@Param("id") id: string, @Param("n", ParseIntPipe) n: number) {
    return this.publishing.restoreDraft(id, n);
  }

  @Post("versions/:n/rollback")
  @WorkspaceRoute("EDITOR")
  rollback(@CurrentMember() m: Member, @Param("id") id: string, @Param("n", ParseIntPipe) n: number, @Body() body: unknown) {
    return this.publishing.rollback(ref(m), id, n, note(body));
  }

  @Post("pause")
  @WorkspaceRoute("EDITOR")
  pause(@CurrentMember() m: Member, @Param("id") id: string) {
    return this.publishing.pause(ref(m), id);
  }

  @Post("resume")
  @WorkspaceRoute("EDITOR")
  resume(@CurrentMember() m: Member, @Param("id") id: string) {
    return this.publishing.resume(ref(m), id);
  }

  @Get("rego")
  @WorkspaceRoute("VIEWER")
  rego(@CurrentMember() m: Member, @Param("id") id: string, @Query("source") source = "live") {
    return this.publishing.rego(ref(m), id, source);
  }
}
