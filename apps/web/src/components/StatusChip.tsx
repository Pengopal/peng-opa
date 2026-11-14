import type { PolicyStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABEL: Record<PolicyStatus, string> = { DRAFT: "Draft", LIVE: "Live", PAUSED: "Paused" };
const DOT: Record<PolicyStatus, string> = { LIVE: "bg-success", DRAFT: "bg-muted-foreground/60", PAUSED: "bg-warning" };

/** Policy status: a coloured dot and its name (Live green, Draft grey, Paused amber). */
export function StatusChip({ status }: { status: PolicyStatus }) {
  return (
    <span data-slot="status-chip" className="inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap text-foreground">
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[status])} />
      {LABEL[status]}
    </span>
  );
}
