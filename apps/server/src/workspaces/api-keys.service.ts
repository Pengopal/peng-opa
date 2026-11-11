import { Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomInt } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";

const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const KEY_PATTERN = /^pk_live_[A-Za-z0-9]{32}$/;
const LAST_USED_RESOLUTION_MS = 60_000;

export interface ApiKeyIdentity {
  workspaceId: string;
  workspaceShortId: string;
  keyId: string;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Workspace API keys. Only a SHA-256 hash and a short visible prefix are stored. */
@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a key in the current workspace; the plaintext key is returned only here. */
  async create(workspaceId: string, name: string) {
    let key = "pk_live_";
    for (let i = 0; i < 32; i++) key += BASE62[randomInt(BASE62.length)];
    const row = await this.prisma.scoped.apiKey.create({ data: { workspaceId, name, prefix: key.slice(0, 12), hash: sha256(key) } });
    return { id: row.id, name: row.name, prefix: row.prefix, createdAt: row.createdAt, key };
  }

  async list() {
    const rows = await this.prisma.scoped.apiKey.findMany({ where: { revokedAt: null }, orderBy: { createdAt: "desc" } });
    return rows.map(({ id, name, prefix, createdAt, lastUsedAt }) => ({ id, name, prefix, createdAt, lastUsedAt }));
  }

  async revoke(id: string) {
    const { count } = await this.prisma.scoped.apiKey.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!count) throw new NotFoundException("API key not found");
  }

  /** Resolve an `Authorization: Bearer pk_live_…` header to its workspace, or null if invalid or revoked. */
  async authenticate(header: string | undefined): Promise<ApiKeyIdentity | null> {
    const key = /^Bearer (\S+)$/.exec(header ?? "")?.[1];
    if (!key || !KEY_PATTERN.test(key)) return null;
    const row = await this.prisma.unscoped.apiKey.findUnique({
      where: { hash: sha256(key) },
      include: { workspace: { select: { shortId: true } } },
    });
    if (!row || row.revokedAt) return null;
    if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS) {
      // Fire-and-forget: a lost lastUsedAt update must never fail a decision.
      void this.prisma.unscoped.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
    }
    return { workspaceId: row.workspaceId, workspaceShortId: row.workspace.shortId, keyId: row.id };
  }
}
