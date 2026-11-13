import { ArrowDown, Timer } from "lucide-react";
import { DecisionChip } from "@/components/DecisionChip";
import { cn } from "@/lib/utils";

const INPUT = [
  ["customer.tier", "gold"],
  ["order.total", "250"],
  ["customer.first_order", "false"],
] as const;

/** An example decision, drawn in HTML: what the app sends, the rule that matched, and the answer. */
export function DecisionPreview({ className }: { className?: string }) {
  return (
    <figure aria-label="Example decision" className={cn("rounded-2xl border bg-card p-4 shadow-[0_24px_60px_-30px_rgb(22_22_26/0.35)] sm:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">POST /v1/decide/checkout-discount</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Example</span>
      </div>

      <div className="mt-4 rounded-xl bg-muted/60 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Your app sends</p>
        <ul className="flex flex-wrap gap-1.5">
          {INPUT.map(([k, v]) => (
            <li key={k} className="rounded-md border bg-background px-2 py-1 font-mono text-xs">
              <span className="text-muted-foreground">{k}</span> <span className="text-foreground">= {v}</span>
            </li>
          ))}
        </ul>
      </div>

      <ArrowDown className="mx-auto my-2 size-4 text-muted-foreground" aria-hidden />

      <div className="rounded-xl border p-3">
        <p className="text-xs font-medium text-muted-foreground">Rule 1 matched</p>
        <p className="mt-1 text-sm font-medium">Gold customers on bigger orders</p>
        <p className="mt-0.5 text-xs text-muted-foreground">When tier is gold and order total is at least 200</p>
      </div>

      <ArrowDown className="mx-auto my-2 size-4 text-muted-foreground" aria-hidden />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-success/25 bg-success-muted/50 p-3">
        <div className="flex items-center gap-2">
          <DecisionChip allowed />
          <span className="text-sm font-medium">15% discount</span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Timer className="size-3.5" aria-hidden /> 8 ms
        </span>
      </div>
    </figure>
  );
}
