import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDay, formatNumber } from "@/lib/format";
import type { DayPoint } from "./insights";

const ALLOWED = "var(--color-chart-1)";
const DENIED = "var(--color-chart-2)";

/** 14 days of decisions, allowed stacked under denied; a table view carries the exact numbers. */
export function DecisionsChart({ days }: { days?: DayPoint[] }) {
  const [asTable, setAsTable] = useState(false);
  const total = days?.reduce((s, d) => s + d.allowed + d.denied, 0) ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Decisions, last 14 days</h2>
        </CardTitle>
        <CardDescription>{days ? `${formatNumber(total)} decisions` : " "}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={() => setAsTable((v) => !v)}>
            {asTable ? "Show chart" : "Show table"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
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
                  <TableCell>{formatDay(d.date)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(d.allowed)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(d.denied)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="h-64 w-full" role="img" aria-label={`Bar chart of allowed and denied decisions per day; ${formatNumber(total)} in total. Use "Show table" for the numbers.`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barCategoryGap="25%">
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="date" tickFormatter={formatDay} tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" minTickGap={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
                  labelFormatter={(d) => formatDay(String(d))}
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-popover-foreground)", fontSize: 12 }}
                />
                {/* Legend text stays in text colour; the dot carries identity. */}
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span className="text-muted-foreground">{v}</span>} />
                {/* 2px surface gap between stacked segments; rounded data-end on top only. */}
                <Bar dataKey="allowed" name="Allowed" stackId="d" fill={ALLOWED} stroke="var(--color-card)" strokeWidth={2} />
                <Bar dataKey="denied" name="Denied" stackId="d" fill={DENIED} stroke="var(--color-card)" strokeWidth={2} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
