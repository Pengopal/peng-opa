import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { setOnUnauthorized } from "@/lib/api";
import { applyTheme, readTheme } from "@/lib/theme";
import { router } from "./router";
import "./index.css";

applyTheme(readTheme());

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, retry: 1 } } });
setOnUnauthorized(() => {
  queryClient.clear();
  void router.navigate({ to: "/sign-in", search: { redirect: window.location.pathname } });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
