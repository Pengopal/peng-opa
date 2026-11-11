import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorText } from "@/components/ErrorText";
import { api } from "@/lib/api";
import type { EditorContext } from "./PolicyEditor";

const CodeViewer = lazy(() => import("./CodeViewer"));

/** Read-only view of the Rego generated from the draft or the live version. */
export function RegoView({ policy, draft }: EditorContext) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<"draft" | "live">("draft");
  const rego = useQuery({
    queryKey: ["rego", policy.id, source],
    enabled: open,
    gcTime: 0,
    queryFn: async () => {
      if (source === "draft") await draft.flush();
      return api<{ rego: string }>(`/api/policies/${policy.id}/rego?source=${source}`);
    },
  });

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Code2 aria-hidden /> Rego
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generated Rego</DialogTitle>
            <DialogDescription>What the OPA engine runs. It's generated from your rules — edit the rules, not this.</DialogDescription>
          </DialogHeader>
          <div role="radiogroup" aria-label="Source" className="inline-flex w-fit rounded-lg border p-0.5 text-sm">
            {(["draft", "live"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={source === s}
                disabled={s === "live" && !policy.liveVersion}
                onClick={() => setSource(s)}
                className={source === s ? "rounded-md bg-muted px-3 py-1 font-medium" : "rounded-md px-3 py-1 text-muted-foreground disabled:opacity-50"}
              >
                {s === "draft" ? "Draft" : `Live v${policy.liveVersion?.number ?? ""}`}
              </button>
            ))}
          </div>
          <ErrorText error={rego.error} />
          {rego.data ? (
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <CodeViewer value={rego.data.rego} />
            </Suspense>
          ) : (
            !rego.error && <Skeleton className="h-96 w-full" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
