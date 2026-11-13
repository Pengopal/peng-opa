import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Summary } from "./insights";

/** Three steps to a working integration, with a progress bar; hidden once all are done. */
export function SetupChecklist({ summary }: { summary: Summary }) {
  const steps = [
    { label: "Test a policy", hint: "Run a sample in the Try-it panel.", done: summary.hasTested, to: "/policies" as const },
    { label: "Publish", hint: "Make a policy live so your systems can call it.", done: summary.hasPublished, to: "/policies" as const },
    { label: "Make your first API call", hint: "Copy a code sample from Connect.", done: !!summary.firstApiCallAt, to: "/connect" as const },
  ];
  if (steps.every((s) => s.done)) return null;
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Get set up</h2>
        </CardTitle>
        <div className="mt-1 flex items-center gap-2.5">
          <div role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={steps.length} className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
          <span className="text-sm text-muted-foreground">
            {doneCount} of {steps.length} done
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map((s) => (
            <li key={s.label} aria-label={s.label} data-done={String(s.done)}>
              <Link to={s.to} className="flex h-full gap-3 rounded-lg border p-3 hover:bg-muted/50">
                {s.done ? <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Done" /> : <Circle className="size-5 shrink-0 text-muted-foreground" aria-label="Not done" />}
                <span>
                  <span className={s.done ? "text-sm font-medium text-muted-foreground line-through" : "text-sm font-medium"}>{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
