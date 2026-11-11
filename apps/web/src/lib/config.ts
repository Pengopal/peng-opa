import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export interface PublicConfig {
  googleEnabled: boolean;
  demoPublic: boolean;
  smtpEnabled: boolean;
}

/** What this installation has switched on (Google sign-in, public demo, invite emails). */
export function useConfig() {
  return useQuery({ queryKey: ["config"], queryFn: () => api<PublicConfig>("/api/config"), staleTime: Infinity });
}
