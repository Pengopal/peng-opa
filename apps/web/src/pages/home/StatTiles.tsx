import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatPercent } from "@/lib/format";
import { dayDelta, type DayPoint, type Summary } from "./insights";

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-background px-4 py-3 first:pl-0 max-lg:odd:pl-0">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight" data-numeric>
        {value}
      </dd>
      <dd className="mt-0.5 min-h-4 text-xs text-muted-foreground">{note}</dd>
    </div>
  );
}

const signed = (n: number, unit: string) => `${n > 0 ? "+" : ""}${n}${unit} vs yesterday`;
const total = (d: DayPoint) => d.allowed + d.denied;
const allowRate = (d: DayPoint) => (total(d) ? d.allowed / total(d) : 0);

/** Today's headline numbers in one divided strip; "—" when there is nothing to measure yet. */
export function StatTiles({ summary, days }: { summary?: Summary; days?: DayPoint[] }) {
  if (!summary) return <Skeleton className="h-20 w-full" />;

  // Today is still running, so a % change against all of yesterday would read as a drop every morning: show yesterday's total instead.
  const yesterday = days && days.length > 1 ? total(days[days.length - 2]) : null;
  const rate = days && days.length > 1 && total(days[days.length - 2]) > 0 && summary.allowRateToday !== null ? dayDelta(days, allowRate) : null;

  return (
    <dl className="grid grid-cols-2 gap-px border-y bg-border lg:grid-cols-4">
      <Metric label="Decisions today" value={formatNumber(summary.decisionsToday)} note={yesterday !== null ? `${formatNumber(yesterday)} yesterday` : undefined} />
      <Metric
        label="Allow rate today"
        value={summary.allowRateToday === null ? "—" : formatPercent(summary.allowRateToday)}
        note={rate ? signed(Math.round((rate.today - rate.yesterday) * 100), " pts") : undefined}
      />
      <Metric label="Live policies" value={formatNumber(summary.livePolicies)} />
      <Metric label="Response time (p95)" value={summary.p95LatencyToday === null ? "—" : `${summary.p95LatencyToday} ms`} note="95% of decisions were this fast or faster" />
    </dl>
  );
}
