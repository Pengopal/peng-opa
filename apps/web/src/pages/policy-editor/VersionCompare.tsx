import { useQueries } from "@tanstack/react-query";
import { describeResult, describeRule, diffRuleSets, type RuleChange, type RuleSet } from "@peng/shared";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ChangeMark } from "./ChangeMark";
import { summarizeChanges } from "./PublishDialog";

function Column({ title, rs, marks }: { title: string; rs: RuleSet; marks: Map<string, RuleChange["kind"]> }) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ol className="divide-y border-y text-sm">
        {rs.rules.map((r, i) => {
          const kind = marks.get(r.id);
          return (
            <li key={r.id} className={cn("px-2 py-2.5", kind && "bg-muted/60")}>
              <p className="mb-0.5 flex items-center justify-between gap-2 font-medium">
                <span className="min-w-0 truncate">
                  {i + 1}. {r.label}
                </span>
                {kind && <ChangeMark kind={kind} />}
              </p>
              <p className="text-[13px] text-muted-foreground">{describeRule(r, rs)}</p>
            </li>
          );
        })}
        <li className="px-2 py-2.5 text-[13px] text-muted-foreground">Otherwise → {describeResult(rs.otherwise, rs)}</li>
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
  const marks = new Map<string, RuleChange["kind"]>(changes.map((c) => [c.ruleId, c.kind]));

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
