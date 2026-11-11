import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { api } from "@/lib/api";

/** Answers for the mocked api(): "METHOD /path" or "/path" (any method) → value or function of the body. */
export type ApiRoutes = Record<string, unknown | ((body: unknown) => unknown)>;

/** Requires `vi.mock("@/lib/api", …)` in the test file (see mockApi). */
export function serveApi(routes: ApiRoutes) {
  vi.mocked(api).mockImplementation(async (path: string, init: { method?: string; body?: unknown } = {}) => {
    const method = init.method ?? "GET";
    const hit = Object.entries(routes).find(([k]) => k === `${method} ${path}` || k === path || (k.endsWith("*") && path.startsWith(k.slice(0, -1))));
    if (!hit) throw new Error(`unmocked api call: ${method} ${path}`);
    const v = hit[1];
    return typeof v === "function" ? (v as (b: unknown) => unknown)(init.body) : v;
  });
}

/** Render a page inside a QueryClient and a memory router (any path renders `ui`). */
export async function renderPage(ui: ReactNode, path = "/") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const root = createRootRoute({ component: () => <Outlet /> });
  const page = createRoute({ getParentRoute: () => root, path: "$", component: () => <>{ui}</> });
  const index = createRoute({ getParentRoute: () => root, path: "/", component: () => <>{ui}</> });
  const router = createRouter({ routeTree: root.addChildren([index, page]), history: createMemoryHistory({ initialEntries: [path] }) });
  const result = render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await router.load();
  return { ...result, router, qc };
}

export const fakeWorkspace = {
  id: "ws-1",
  name: "Acme",
  slug: "acme-abc123",
  shortId: "abc123",
  isDemo: false,
  role: "OWNER" as const,
};
