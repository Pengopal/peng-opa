/** Thin fetch wrapper for the app's own API: JSON in/out, session cookie, current workspace header. */

export class ApiError extends Error {
  readonly status: number;
  readonly body: Record<string, unknown>;

  constructor(status: number, message: string, body: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

let workspaceId: string | undefined;
let onUnauthorized: () => void = () => undefined;

export function setWorkspaceId(id: string | undefined) {
  workspaceId = id;
}

export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

export interface ApiInit extends Omit<RequestInit, "body"> {
  body?: unknown;
}

function messageOf(body: Record<string, unknown>, status: number): string {
  const m = body.message ?? (body.error as { message?: string } | undefined)?.message;
  if (Array.isArray(m)) return m.join(", ");
  return typeof m === "string" ? m : `Request failed (${status})`;
}

export async function api<T = unknown>(path: string, init: ApiInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (workspaceId) headers.set("x-workspace-id", workspaceId);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (res.status === 401) onUnauthorized();
    throw new ApiError(res.status, messageOf(body, res.status), body);
  }
  return body as T;
}
