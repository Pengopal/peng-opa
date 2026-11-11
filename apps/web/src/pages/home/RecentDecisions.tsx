import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DecisionChip } from "@/components/DecisionChip";
import { formatRelative } from "@/lib/format";
import type { RecentDecision } from "./insights";

export function RecentDecisions({ items }: { items?: RecentDecision[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Latest decisions</h2>
        </CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link to="/activity">View all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!items ? (
          <Skeleton className="h-40 w-full" />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No decisions yet. They appear here as soon as you test or call a policy.</p>
        ) : (
          <ul className="divide-y">
            {items.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{d.policyName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {d.matchedRule ?? "No rule matched"} · {formatRelative(d.createdAt)}
                  </span>
                </span>
                <DecisionChip allowed={d.allowed} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
