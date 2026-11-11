import { AsyncLocalStorage } from "node:async_hooks";

interface Store {
  workspaceId: string;
}

const storage = new AsyncLocalStorage<Store>();

/** Thrown when tenant data is touched outside a workspace context: a bug, never a user error. */
export class MissingWorkspaceContextError extends Error {
  constructor(model: string, operation: string) {
    super(`${model}.${operation} needs a workspace context (wrap the call in runWithWorkspace)`);
    this.name = "MissingWorkspaceContextError";
  }
}

/**
 * Run `fn` with a workspace context. Awaits inside the context on purpose: Prisma queries are
 * lazy and only execute when awaited, so returning the promise unawaited would lose the context.
 */
export function runWithWorkspace<T>(workspaceId: string, fn: () => PromiseLike<T> | T): Promise<T> {
  return storage.run({ workspaceId }, async () => await fn());
}

export function currentWorkspaceId(): string | undefined {
  return storage.getStore()?.workspaceId;
}
