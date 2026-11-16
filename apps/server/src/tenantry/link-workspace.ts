import type { PrismaClient } from "../generated/prisma/client.js";

/**
 * Links an existing PengOPA workspace to a Tenantry workspace (organization alias), so people signing in
 * with Tenantry land in it instead of a new one. One Tenantry workspace links to at most one here.
 */
export async function linkWorkspace(db: PrismaClient, slug: string, alias: string): Promise<{ id: string; name: string }> {
  const ws = await db.workspace.findUnique({ where: { slug } });
  if (!ws) throw new Error(`No workspace with the slug ${slug}`);
  const taken = await db.workspace.findUnique({ where: { tenantryOrg: alias } });
  if (taken && taken.id !== ws.id) throw new Error(`The Tenantry workspace ${alias} is already linked to ${taken.slug}`);
  const linked = await db.workspace.update({ where: { id: ws.id }, data: { tenantryOrg: alias } });
  return { id: linked.id, name: linked.name };
}
