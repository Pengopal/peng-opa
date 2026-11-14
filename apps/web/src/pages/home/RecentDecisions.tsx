import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DecisionChip } from "@/components/DecisionChip";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { RecentDecision } from "./insights";

export function RecentDecisions({ items }: { items?: RecentDecision[] }) {
  return (
    <section aria-labelledby="latest-heading" className="min-w-0 self-start overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-1.5">
        <h2 id="latest-heading" className="text-sm font-medium">
          Latest decisions
        </h2>
        <Button asChild variant="ghost" size="sm">
          <Link to="/activity">View all</Link>
        </Button>
      </div>
      {!items ? (
        <Skeleton className="m-4 h-40" />
      ) : items.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">No decisions yet. They appear here as soon as you test or call a policy.</p>
      ) : (
        <ul className="divide-y">
          {items.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{d.policyName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {d.matchedRule ?? "No rule matched"} · <time dateTime={d.createdAt} title={formatDateTime(d.createdAt)}>{formatRelative(d.createdAt)}</time>
                </span>
              </span>
              <DecisionChip allowed={d.allowed} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
