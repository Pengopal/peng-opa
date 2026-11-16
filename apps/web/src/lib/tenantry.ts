/** Sign in with Tenantry returns to the page it started from, marked, so the app opens the linked workspace. */
const PARAM = "via";
const VALUE = "tenantry";

export function withTenantryLanding(path: string): string {
  const url = new URL(path, "http://x");
  url.searchParams.set(PARAM, VALUE);
  return `${url.pathname}${url.search}`;
}

export function isTenantryLanding(search: string): boolean {
  return new URLSearchParams(search).get(PARAM) === VALUE;
}

export function withoutTenantryLanding(path: string): string {
  const url = new URL(path, "http://x");
  url.searchParams.delete(PARAM);
  return `${url.pathname}${url.search}`;
}
