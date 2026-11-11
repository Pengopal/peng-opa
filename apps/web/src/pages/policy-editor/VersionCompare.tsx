import { useQueries } from "@tanstack/react-query";
import { describeResult, describeRule, diffRuleSets, type RuleSet } from "@peng/shared";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { summarizeChanges } from "./PublishDialog";

function Column({ title, rs, marks }: { title: string; rs: RuleSet; marks: Map<string, string> }) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ol className="flex flex-col gap-2 text-sm">
        {rs.rules.map((r, i) => (
          <li key={r.id} className="rounded-md border p-2.5">
            <p className="mb-1 flex items-center gap-2 font-medium">
              {i + 1}. {r.label} {marks.get(r.id) && <Badge variant="secondary">{marks.get(r.id)}</Badge>}
            </p>
            <p className="text-muted-foreground">{describeRule(r, rs)}</p>
          </li>
        ))}
        <li className="rounded-md bg-muted/50 p-2.5 text-muted-foreground">Otherwise → {describeResult(rs.otherwise, rs)}</li>
      </ol>
    </section>
  );
}

/** Two versions side by side, rule by rule, with what changed marked. */
export function VersionCompare({ policyId, from, to, onClose }: { policyId: string; from: number; to: number; onClose(): void }) {
  const [a, b] = useQueries({
    queries: [from, to].map((n) => ({ queryKey: ["version", policyId, n], queryFn: () => api<{ ruleSet: RuleSet }>(`/api/policies/${policyId}/versions/${n}`) })),
  });
  const changes = a.data && b.data ? diffRuleSets(a.data.ruleSet, b.data.ruleSet) : [];
  const marks = new Map(changes.map((c) => [c.ruleId, c.kind]));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            v{from} → v{to}
          </DialogTitle>
          <DialogDescription>{a.data && b.data ? summarizeChanges(changes) : "Loading…"}</DialogDescription>
        </DialogHeader>
        {a.data && b.data ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Column title={`v${from}`} rs={a.data.ruleSet} marks={new Map([...marks].filter(([, k]) => k === "removed" || k === "changed" || k === "moved"))} />
            <Column title={`v${to}`} rs={b.data.ruleSet} marks={new Map([...marks].filter(([, k]) => k !== "removed"))} />
          </div>
        ) : (
          <Skeleton className="h-64 w-full" />
        )}
      </DialogContent>
    </Dialog>
  );
}
