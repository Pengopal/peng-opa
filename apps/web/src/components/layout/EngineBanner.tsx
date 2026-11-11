import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

/** Shown while the policy engine is down: decisions fail with 503 until it is back. */
export function EngineBanner() {
  const { data } = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await fetch("/health")).json() as Promise<{ db: string; opa: string }>,
    refetchInterval: 30_000,
  });
  if (!data || (data.opa === "ok" && data.db === "ok")) return null;
  return (
    <div role="status" className="flex items-center gap-2 bg-danger-muted px-4 py-2 text-sm text-danger">
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      {data.opa !== "ok"
        ? "The policy engine is unavailable. Decisions will fail until it's back — it usually recovers within a minute."
        : "The database is unavailable. Changes can't be saved right now."}
    </div>
  );
}
