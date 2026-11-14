import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DecisionChip } from "@/components/DecisionChip";
import { ErrorText } from "@/components/ErrorText";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { DecisionDetail } from "@/lib/types";

const SOURCE_LABEL = { API: "API call", PLAYGROUND: "Try-it panel", DEMO: "Demo traffic" } as const;

/** One decision in full: what was sent, what came back, and a way to try it again. */
export function DecisionDetailSheet({ decisionId, onClose }: { decisionId: string | null; onClose(): void }) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["decision", decisionId],
    enabled: !!decisionId,
    queryFn: () => api<DecisionDetail>(`/api/decisions/${decisionId}`),
  });

  return (
    <ResponsiveSheet
      open={!!decisionId}
      onOpenChange={(o) => !o && onClose()}
      title={data?.policyName ?? "Decision"}
      description={data ? `${SOURCE_LABEL[data.source]} · ${formatDateTime(data.createdAt)}` : " "}
    >
      <div className="flex flex-col divide-y">
        <ErrorText error={error} />
        {isLoading && <Skeleton className="h-64 w-full" />}
        {data && (
          <>
            <div className="flex flex-col gap-2 pb-5">
              <DecisionChip allowed={data.allowed} className="w-fit text-sm" />
              <p className="text-sm">{data.result.reason}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Matched</dt>
                <dd>{data.matchedRule ?? "No rule — the Otherwise result applied"}</dd>
                <dt className="text-muted-foreground">Version</dt>
                <dd>{data.versionNumber ? `v${data.versionNumber}` : "Draft"}</dd>
                <dt className="text-muted-foreground">Time</dt>
                <dd>{data.latencyMs} ms</dd>
                {Object.entries(data.result.outcomes).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-mono text-[13px]">{String(v)}</dd>
                  </div>
                ))}
              </dl>
              {data.missingFields.length > 0 && <p className="text-xs text-muted-foreground">Not sent: {data.missingFields.join(", ")}</p>}
            </div>
            <section aria-labelledby="input-h" className="py-5">
              <h3 id="input-h" className="mb-2 text-sm font-medium">
                Input
              </h3>
              <pre className="max-h-72 overflow-auto rounded-md bg-code p-3 font-mono text-xs text-code-foreground">{JSON.stringify(data.input, null, 2)}</pre>
            </section>
            {data.policyKey && (
              <div className="pt-5">
              <Button asChild>
                <Link to="/policies/$policyId" params={{ policyId: data.policyId }} search={{ replay: data.id }}>
                  <Play aria-hidden /> Replay in playground
                </Link>
              </Button>
              </div>
            )}
          </>
        )}
      </div>
    </ResponsiveSheet>
  );
}
