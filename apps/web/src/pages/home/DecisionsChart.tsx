import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, formatShortDate } from "@/lib/format";
import type { DayPoint } from "./insights";

const ALLOWED = "var(--color-success)";
const DENIED = "var(--color-danger)";

function Key({ color, label, opacity = 1 }: { color: string; label: string; opacity?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="size-2 rounded-full" style={{ background: color, opacity }} />
      {label}
    </span>
  );
}

/** 14 days of decisions, allowed stacked under denied; a table view carries the exact numbers. */
export function DecisionsChart({ days }: { days?: DayPoint[] }) {
  const [asTable, setAsTable] = useState(false);
  const total = days?.reduce((s, d) => s + d.allowed + d.denied, 0) ?? 0;

  return (
    <section aria-labelledby="decisions-heading" className="min-w-0">
      <div className="flex items-center justify-between gap-3 border-b pb-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 id="decisions-heading" className="text-sm font-medium">
            Decisions, last 14 days
          </h2>
          {days && (
            <span className="text-[13px] text-muted-foreground" data-numeric>
              {formatNumber(total)}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setAsTable((v) => !v)}>
          {asTable ? "Show chart" : "Show table"}
        </Button>
      </div>
      <div className="pt-4">
        {!days ? (
          <Skeleton className="h-64 w-full" />
        ) : asTable ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Allowed</TableHead>
                <TableHead className="text-right">Denied</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((d) => (
                <TableRow key={d.date}>
                  <TableCell>{formatShortDate(d.date)}</TableCell>
                  <TableCell className="text-right">{formatNumber(d.allowed)}</TableCell>
                  <TableCell className="text-right">{formatNumber(d.denied)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <>
            <div className="h-60 w-full" role="img" aria-label={`Bar chart of allowed and denied decisions per day; ${formatNumber(total)} in total. Use "Show table" for the numbers.`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="date" tickFormatter={formatShortDate} interval={1} tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={36} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)", opacity: 0.6 }}
                    labelFormatter={(d) => formatShortDate(String(d))}
                    formatter={(v) => formatNumber(Number(v))}
                    contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, color: "var(--color-popover-foreground)", fontSize: 12, boxShadow: "0 4px 12px rgb(0 0 0 / 0.06)" }}
                  />
                  <Bar dataKey="allowed" name="Allowed" stackId="d" fill={ALLOWED} stroke="var(--color-background)" strokeWidth={1} />
                  <Bar dataKey="denied" name="Denied" stackId="d" fill={DENIED} fillOpacity={0.7} stroke="var(--color-background)" strokeWidth={1} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <Key color={ALLOWED} label="Allowed" />
              <Key color={DENIED} label="Denied" opacity={0.7} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
