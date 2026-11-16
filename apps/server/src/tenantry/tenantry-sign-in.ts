import type { JWTPayload } from "jose";
import type { PrismaClient } from "../generated/prisma/client.js";
import { newShortId } from "../prisma/short-id.js";
import { slugify } from "../workspaces/workspaces.service.js";
import { workspaceFromClaims } from "./tenantry-claims.js";

/** "acme-labs" → "Acme labs": a first name for a workspace made from a Tenantry alias; owners can rename it. */
const nameFromAlias = (alias: string) => {
  const words = alias.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * After a Sign in with Tenantry: ties the new session to its Keycloak session (for back-channel sign-out),
 * and puts the person in the PengOPA workspace linked to the Tenantry workspace they chose, with the role
 * their Tenantry groups give. A Tenantry workspace with no PengOPA workspace yet gets one.
 */
export async function linkTenantrySession(
  db: PrismaClient,
  input: { sessionId: string; userId: string; claims: JWTPayload },
): Promise<{ workspaceId: string | null }> {
  const { sessionId, userId, claims } = input;
  const chosen = workspaceFromClaims(claims as Record<string, unknown>);
  return db.$transaction(async (tx) => {
    let workspaceId: string | null = null;
    if (chosen) {
      const shortId = newShortId();
      const ws = await tx.workspace.upsert({
        where: { tenantryOrg: chosen.alias },
        update: {},
        create: {
          name: nameFromAlias(chosen.alias),
          shortId,
          slug: `${slugify(chosen.alias)}-${shortId}`,
          tenantryOrg: chosen.alias,
        },
      });
      await tx.member.upsert({
        where: { workspaceId_userId: { workspaceId: ws.id, userId } },
        update: { role: chosen.role },
        create: { workspaceId: ws.id, userId, role: chosen.role },
      });
      workspaceId = ws.id;
    }
    await tx.tenantrySession.create({
      data: {
        sessionId,
        sub: String(claims.sub),
        ...(typeof claims.sid === "string" ? { sid: claims.sid } : {}),
        workspaceId,
      },
    });
    return { workspaceId };
  });
}
