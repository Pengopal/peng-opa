import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatPercent } from "@/lib/format";
import type { Summary } from "./insights";

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="py-4">
      <CardContent className="px-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Today's headline numbers; "—" when there is nothing to measure yet. */
export function StatTiles({ summary }: { summary?: Summary }) {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Tile label="Decisions today" value={formatNumber(summary.decisionsToday)} />
      <Tile label="Allow rate today" value={summary.allowRateToday === null ? "—" : formatPercent(summary.allowRateToday)} />
      <Tile label="Live policies" value={formatNumber(summary.livePolicies)} />
      <Tile label="Response time (p95)" value={summary.p95LatencyToday === null ? "—" : `${summary.p95LatencyToday} ms`} hint="95% of decisions were at least this fast" />
    </div>
  );
}
