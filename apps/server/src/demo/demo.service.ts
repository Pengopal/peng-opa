import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { createHmac } from "node:crypto";
import type { RuleSet } from "@peng/shared";
import { APP_CONFIG, AppConfig } from "../config/config.js";
import { AuthService } from "../auth/auth.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { runWithWorkspace } from "../prisma/request-context.js";
import { OPA_GATEWAY, OpaGateway } from "../opa-gateway/opa-gateway.js";
import { workspacePolicyPrefix } from "../rego-compiler/naming.js";
import { PublishingService } from "../policies/publishing.service.js";
import { TemplatesService } from "../templates/templates.service.js";
import { WorkspacesService } from "../workspaces/workspaces.service.js";
import type { WorkspaceRef } from "../policies/policies.service.js";
import { HistorySeeder, SeedPolicy } from "./history-seeder.js";
import { TrafficSimulator } from "./traffic-simulator.service.js";
import { PUBLIC_DEMO_EMAIL } from "./public-demo.js";

export const DEMO_NAME = "Acme Retail (Demo)";
export const DEMO_TEMPLATES = ["checkout-discount", "refund-approval", "admin-console-access", "loan-pre-approval"];
const PUBLIC_OWNER = "demo-owner@peng-opa.local";
const PUBLIC_VIEWER = PUBLIC_DEMO_EMAIL;

@Injectable()
export class DemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    private readonly templates: TemplatesService,
    private readonly publishing: PublishingService,
    private readonly seeder: HistorySeeder,
    private readonly traffic: TrafficSimulator,
    private readonly authService: AuthService,
    @Inject(OPA_GATEWAY) private readonly opa: OpaGateway,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** A new demo workspace owned by the caller, with live policies and two weeks of history. */
  async create(userId: string, name = DEMO_NAME) {
    const ws = await this.workspaces.create(userId, name, { isDemo: true });
    await this.populate({ workspaceId: ws.id, workspaceShortId: ws.shortId, userId });
    return ws;
  }

  /** Put a demo workspace back to its original state (members and API keys are kept). */
  async reset(ref: WorkspaceRef) {
    const ws = await this.prisma.unscoped.workspace.findUnique({ where: { id: ref.workspaceId } });
    if (!ws?.isDemo) throw new ForbiddenException("Only demo workspaces can be reset");
    this.traffic.stop(ref.workspaceId);
    const where = { workspaceId: ref.workspaceId };
    const db = this.prisma.unscoped;
    await db.$transaction([db.decision.deleteMany({ where }), db.usageDaily.deleteMany({ where }), db.policyEvent.deleteMany({ where }), db.policy.deleteMany({ where })]);
    for (const id of await this.opa.listPolicyIds(workspacePolicyPrefix(ref.workspaceShortId))) await this.opa.deletePolicy(id);
    await this.populate(ref);
    return { reset: true };
  }

  /** Shared read-only demo for the website (DEMO_PUBLIC=true): signs the visitor in as a VIEWER. */
  async publicLogin(): Promise<{ workspaceId: string; headers: Headers }> {
    if (!this.config.demoPublic) throw new NotFoundException();
    const password = createHmac("sha256", this.config.betterAuthSecret).update("public-demo").digest("base64url");
    const owner = await this.ensureUser(PUBLIC_OWNER, "Demo owner", password);
    const viewer = await this.ensureUser(PUBLIC_VIEWER, "Demo visitor", password);

    let member = await this.prisma.unscoped.member.findFirst({ where: { userId: owner, workspace: { isDemo: true } } });
    if (!member) {
      const ws = await this.create(owner, "Acme Retail (Public demo)");
      member = await this.prisma.unscoped.member.findFirstOrThrow({ where: { userId: owner, workspaceId: ws.id } });
    }
    const workspaceId = member.workspaceId;
    await this.prisma.unscoped.member.upsert({
      where: { workspaceId_userId: { workspaceId, userId: viewer } },
      create: { workspaceId, userId: viewer, role: "VIEWER" },
      update: {},
    });
    const res = await this.authService.auth.api.signInEmail({ body: { email: PUBLIC_VIEWER, password }, asResponse: true });
    return { workspaceId, headers: res.headers };
  }

  private async ensureUser(email: string, name: string, password: string): Promise<string> {
    const existing = await this.prisma.unscoped.user.findUnique({ where: { email } });
    if (existing) return existing.id;
    const created = await this.authService.auth.api.signUpEmail({ body: { email, password, name } });
    return created.user.id;
  }

  private async populate(ref: WorkspaceRef) {
    await runWithWorkspace(ref.workspaceId, async () => {
      const policies: SeedPolicy[] = [];
      for (const id of DEMO_TEMPLATES) {
        const p = await this.templates.use(ref, id);
        const { version } = await this.publishing.publishDraft(ref, p.id, "Demo setup");
        policies.push({ id: p.id, key: p.key, versionNumber: version, ruleSet: p.draft as RuleSet });
      }
      await this.seeder.seed(ref.workspaceId, ref.workspaceShortId, policies);
    });
  }
}
