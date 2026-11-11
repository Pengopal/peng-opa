import { Prisma } from "../generated/prisma/client.js";
import { currentWorkspaceId, MissingWorkspaceContextError } from "./request-context.js";

/** Models owned by a workspace. Every query on them is filtered to the current workspace. */
export const TENANT_MODELS = new Set([
  "Member",
  "Invite",
  "ApiKey",
  "Policy",
  "PolicyVersion",
  "PolicyEvent",
  "SamplePayload",
  "Decision",
  "UsageDaily",
]);

const WHERE_OPS = new Set([
  "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany",
  "count", "aggregate", "groupBy", "update", "updateMany", "updateManyAndReturn",
  "delete", "deleteMany", "upsert",
]);
const CREATE_OPS = new Set(["create", "createMany", "createManyAndReturn"]);

/**
 * Adds `workspaceId = <current>` to every read/update/delete and forces it on every create.
 * Nested writes into tenant models are not rewritten: write them with their own call.
 */
export const workspaceScope = Prisma.defineExtension({
  name: "workspace-scope",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!TENANT_MODELS.has(model)) return query(args);
        const workspaceId = currentWorkspaceId();
        if (!workspaceId) throw new MissingWorkspaceContextError(model, operation);
        const a = (args ?? {}) as Record<string, unknown>;

        if (WHERE_OPS.has(operation)) a.where = { ...((a.where as object) ?? {}), workspaceId };
        if (operation === "upsert") a.create = { ...(a.create as object), workspaceId };
        if (CREATE_OPS.has(operation)) {
          a.data = Array.isArray(a.data)
            ? a.data.map((d: object) => ({ ...d, workspaceId }))
            : { ...(a.data as object), workspaceId };
        }
        return query(a);
      },
    },
  },
});
