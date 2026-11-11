import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DecisionChip } from "@/components/DecisionChip";
import { ErrorText } from "@/components/ErrorText";
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
    <Sheet open={!!decisionId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{data?.policyName ?? "Decision"}</SheetTitle>
          <SheetDescription>{data ? `${SOURCE_LABEL[data.source]} · ${formatDateTime(data.createdAt)}` : " "}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-4 pb-6">
          <ErrorText error={error} />
          {isLoading && <Skeleton className="h-64 w-full" />}
          {data && (
            <>
              <div className="flex flex-col gap-2 rounded-lg border p-4">
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
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
                </dl>
                {data.missingFields.length > 0 && <p className="text-xs text-muted-foreground">Not sent: {data.missingFields.join(", ")}</p>}
              </div>
              <section aria-labelledby="input-h">
                <h3 id="input-h" className="mb-2 text-sm font-medium">
                  Input
                </h3>
                <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(data.input, null, 2)}</pre>
              </section>
              {data.policyKey && (
                <Button asChild>
                  <Link to="/policies/$policyId" params={{ policyId: data.policyId }} search={{ replay: data.id }}>
                    <Play aria-hidden /> Replay in playground
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
