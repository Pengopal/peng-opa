import type { Role } from "../generated/prisma/client.js";

/** A Tenantry workspace and the role it gives (Tenantry hard rule 2: only organization.<alias>.groups). */
export interface TenantryWorkspace {
  alias: string;
  role: Role;
}

const RANK: readonly [group: string, role: Role][] = [
  ["owners", "OWNER"],
  ["admins", "EDITOR"],
  ["members", "VIEWER"],
];

/** A group path from the token ("/admins") or a bare name; a nested group ("/team/admins") is not a role. */
const groupName = (group: string) => (group.startsWith("/") ? group.slice(1) : group);

/** The highest PengOPA role the Tenantry groups give, or null when none is known. */
export function roleFromGroups(groups: readonly string[]): Role | null {
  const names = new Set(groups.map(groupName));
  return RANK.find(([group]) => names.has(group))?.[1] ?? null;
}

/** The one workspace chosen at sign-in (the organization scope names exactly one), or null. */
export function workspaceFromClaims(claims: Record<string, unknown>): TenantryWorkspace | null {
  const orgs = claims.organization;
  if (!orgs || typeof orgs !== "object" || Array.isArray(orgs)) return null;
  const entries = Object.entries(orgs as Record<string, unknown>);
  if (entries.length !== 1) return null;
  const [alias, value] = entries[0]!;
  const groups = (value as { groups?: unknown } | null)?.groups;
  const role = Array.isArray(groups) ? roleFromGroups(groups.filter((g): g is string => typeof g === "string")) : null;
  return role ? { alias, role } : null;
}
