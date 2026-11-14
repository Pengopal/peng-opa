import { cn } from "@/lib/utils";

/** The one way the app shows a decision: a coloured dot and the word "Allowed" or "Denied". */
export function DecisionChip({ allowed, className }: { allowed: boolean; className?: string }) {
  return (
    <span
      data-slot="decision-chip"
      data-decision={allowed ? "allow" : "deny"}
      className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap", allowed ? "text-success" : "text-danger", className)}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", allowed ? "bg-success" : "bg-danger")} />
      {allowed ? "Allowed" : "Denied"}
    </span>
  );
}
