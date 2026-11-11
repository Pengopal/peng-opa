import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { runWithWorkspace } from "../prisma/request-context.js";
import { newShortId } from "../prisma/short-id.js";
import { OPA_GATEWAY, OpaGateway } from "../opa-gateway/opa-gateway.js";
import { OpaUnavailableError } from "../opa-gateway/errors.js";
import { workspacePolicyPrefix } from "../rego-compiler/naming.js";

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  shortId: string;
  isDemo: boolean;
  role: "OWNER" | "EDITOR" | "VIEWER";
}

const slugify = (name: string) =>
  name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "workspace";

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPA_GATEWAY) private readonly opa: OpaGateway,
  ) {}

  /** Creates a workspace with the caller as OWNER. */
  async create(userId: string, name: string, opts: { isDemo?: boolean } = {}): Promise<WorkspaceSummary> {
    const shortId = newShortId();
    const ws = await this.prisma.unscoped.workspace.create({
      data: { name, shortId, slug: `${slugify(name)}-${shortId}`, isDemo: opts.isDemo ?? false },
    });
    await runWithWorkspace(ws.id, () => this.prisma.scoped.member.create({ data: { workspaceId: ws.id, userId, role: "OWNER" } }));
    return { id: ws.id, name: ws.name, slug: ws.slug, shortId: ws.shortId, isDemo: ws.isDemo, role: "OWNER" };
  }

  async listForUser(userId: string): Promise<WorkspaceSummary[]> {
    const memberships = await this.prisma.unscoped.member.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
    return memberships.map(({ workspace: w, role }) => ({ id: w.id, name: w.name, slug: w.slug, shortId: w.shortId, isDemo: w.isDemo, role }));
  }

  async rename(workspaceId: string, name: string) {
    return this.prisma.unscoped.workspace.update({ where: { id: workspaceId }, data: { name } });
  }

  /** Deletes the workspace and its data, then removes its policies from OPA (sync cleans up if OPA is down). */
  async delete(workspaceId: string, shortId: string): Promise<void> {
    await this.prisma.unscoped.workspace.delete({ where: { id: workspaceId } });
    try {
      for (const id of await this.opa.listPolicyIds(workspacePolicyPrefix(shortId))) await this.opa.deletePolicy(id);
    } catch (e) {
      if (!(e instanceof OpaUnavailableError)) throw e;
      this.logger.warn(`OPA unavailable while deleting workspace ${shortId}; sync will remove its policies`);
    }
  }
}
