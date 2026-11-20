import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { api, setOnUnauthorized } from "@/lib/api";
import { startAnalytics } from "@/lib/analytics";
import type { PublicConfig } from "@/lib/config";
import { applyTheme, readTheme } from "@/lib/theme";
import { router } from "./router";
import "./index.css";

applyTheme(readTheme());

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, retry: 1 } } });
setOnUnauthorized(() => {
  queryClient.clear();
  void router.navigate({ to: "/sign-in", search: { redirect: window.location.pathname } });
});

// Analytics start once the server says they are on (lib/analytics.ts); the config stays cached for the app.
void queryClient
  .fetchQuery({ queryKey: ["config"], queryFn: () => api<PublicConfig>("/api/config"), staleTime: Infinity })
  .then((c) => startAnalytics(c.posthogKey))
  .catch(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
