import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export interface PublicConfig {
  googleEnabled: boolean;
  tenantryEnabled: boolean;
  demoPublic: boolean;
  smtpEnabled: boolean;
  /** PostHog project key; null when analytics are off. */
  posthogKey: string | null;
}

/** What this installation has switched on (Google and Tenantry sign-in, public demo, invite emails). */
export function useConfig() {
  return useQuery({ queryKey: ["config"], queryFn: () => api<PublicConfig>("/api/config"), staleTime: Infinity });
}
