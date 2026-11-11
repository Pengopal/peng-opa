/** The shared account behind "Try the live demo" (DEMO_PUBLIC=true). Everyone who clicks it is this user. */
export const PUBLIC_DEMO_EMAIL = "demo@peng-opa.local";

const TRY_IT = /^\/api\/policies\/[^/]+\/try$/;
const AUTH_ALLOWED = new Set(["/api/auth/sign-in/email", "/api/auth/sign-out"]);

/**
 * The shared demo account may read anything in its workspace and use Try it, and nothing else:
 * no new workspaces, keys, invites or edits, and no account changes through Better Auth.
 */
export function publicDemoMayDo(method: string, path: string): boolean {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  return TRY_IT.test(path) || AUTH_ALLOWED.has(path);
}
