import type { PolicyStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABEL: Record<PolicyStatus, string> = { DRAFT: "Draft", LIVE: "Live", PAUSED: "Paused" };
const TONE: Record<PolicyStatus, string> = {
  LIVE: "bg-success-muted text-success",
  DRAFT: "bg-muted text-muted-foreground",
  PAUSED: "bg-warning-muted text-warning",
};

/** Policy status: a pill with a dot, coloured by state (Live green, Draft grey, Paused amber). */
export function StatusChip({ status }: { status: PolicyStatus }) {
  return (
    <span data-slot="status-chip" className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONE[status])}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {LABEL[status]}
    </span>
  );
}
