import { ConflictException, ForbiddenException, GoneException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { Role } from "../generated/prisma/client.js";
import { APP_CONFIG, AppConfig } from "../config/config.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { runWithWorkspace } from "../prisma/request-context.js";
import type { SessionUser } from "../auth/request-types.js";
import { Mailer } from "./mailer.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Members and invites of the current workspace (calls run inside the workspace context). */
@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: Mailer,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async list() {
    const members = await this.prisma.scoped.member.findMany({ include: { user: true }, orderBy: { createdAt: "asc" } });
    return members.map((m) => ({ id: m.id, userId: m.userId, name: m.user.name, email: m.user.email, role: m.role, createdAt: m.createdAt }));
  }

  async changeRole(memberId: string, role: Role) {
    const member = await this.find(memberId);
    if (member.role === "OWNER" && role !== "OWNER") await this.assertNotLastOwner();
    const updated = await this.prisma.scoped.member.update({ where: { id: memberId }, data: { role } });
    return { id: updated.id, role: updated.role };
  }

  async remove(memberId: string) {
    const member = await this.find(memberId);
    if (member.role === "OWNER") await this.assertNotLastOwner();
    await this.prisma.scoped.member.delete({ where: { id: memberId } });
  }

  async invite(workspaceId: string, email: string, role: Role) {
    const token = randomBytes(24).toString("base64url");
    const invite = await this.prisma.scoped.invite.create({
      data: { workspaceId, email, role, token, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
      include: { workspace: { select: { name: true } } },
    });
    const inviteUrl = `${this.config.appUrl}/invite/${token}`;
    await this.mailer.sendInvite(email, invite.workspace.name, inviteUrl);
    return { id: invite.id, email, role, expiresAt: invite.expiresAt, inviteUrl, emailSent: this.mailer.enabled };
  }

  async pendingInvites() {
    const invites = await this.prisma.scoped.invite.findMany({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    return invites.map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expiresAt, inviteUrl: `${this.config.appUrl}/invite/${i.token}` }));
  }

  async revokeInvite(inviteId: string) {
    const { count } = await this.prisma.scoped.invite.deleteMany({ where: { id: inviteId } });
    if (!count) throw new NotFoundException("Invite not found");
  }

  /** Accept by token. Only the invited email may accept; accepting again is a no-op. */
  async accept(user: SessionUser, token: string): Promise<{ workspaceId: string }> {
    const invite = await this.prisma.unscoped.invite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException("This invite link is not valid");
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException(`This invite is for ${invite.email}. Sign in with that address to accept it.`);
    }
    const { workspaceId } = invite;
    const existing = await this.prisma.unscoped.member.findUnique({ where: { workspaceId_userId: { workspaceId, userId: user.id } } });
    if (existing) return { workspaceId };
    if (invite.acceptedAt || invite.expiresAt < new Date()) throw new GoneException("This invite has expired. Ask for a new one.");

    await runWithWorkspace(workspaceId, async () => {
      await this.prisma.scoped.member.create({ data: { workspaceId, userId: user.id, role: invite.role } });
      await this.prisma.scoped.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    });
    return { workspaceId };
  }

  private async find(memberId: string) {
    const member = await this.prisma.scoped.member.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException("Member not found");
    return member;
  }

  private async assertNotLastOwner() {
    const owners = await this.prisma.scoped.member.count({ where: { role: "OWNER" } });
    if (owners <= 1) throw new ConflictException("A workspace needs at least one owner. Make someone else an owner first.");
  }
}
