import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import type { Summary } from "./insights";

/** Three steps to a working integration, inline; hidden once all are done. */
export function SetupChecklist({ summary }: { summary: Summary }) {
  const steps = [
    { label: "Test a policy", hint: "Run a sample in the Try-it panel.", done: summary.hasTested, to: "/policies" as const },
    { label: "Publish", hint: "Make a policy live so your systems can call it.", done: summary.hasPublished, to: "/policies" as const },
    { label: "Make your first API call", hint: "Copy a code sample from Connect.", done: !!summary.firstApiCallAt, to: "/connect" as const },
  ];
  if (steps.every((s) => s.done)) return null;
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section aria-labelledby="setup-heading" className="rounded-lg border">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2.5">
        <h2 id="setup-heading" className="text-sm font-medium">
          Get set up
        </h2>
        <span className="text-[13px] text-muted-foreground" data-numeric>
          {doneCount} of {steps.length} done
        </span>
      </div>
      <ol className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {steps.map((s, i) => (
          <li key={s.label} aria-label={s.label} data-done={String(s.done)}>
            <Link to={s.to} className="flex h-full gap-3 px-4 py-3 transition-colors hover:bg-muted/60">
              {s.done ? (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground" aria-label="Done">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
              ) : (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] text-muted-foreground" aria-label="Not done">
                  {i + 1}
                </span>
              )}
              <span>
                <span className={s.done ? "text-sm font-medium text-muted-foreground" : "text-sm font-medium"}>{s.label}</span>
                <span className="block text-xs text-muted-foreground">{s.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
