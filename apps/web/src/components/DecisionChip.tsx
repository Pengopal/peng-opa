import { CircleCheck, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";

/** The one way the app shows a decision: icon + "Allowed" / "Denied" in the success/danger colours. */
export function DecisionChip({ allowed, className }: { allowed: boolean; className?: string }) {
  const Icon = allowed ? CircleCheck : CircleX;
  return (
    <span
      data-slot="decision-chip"
      className={cn(
        "inline-flex items-center gap-1 rounded-full py-0.5 pr-2 pl-1.5 text-xs font-medium whitespace-nowrap",
        allowed ? "bg-success-muted text-success" : "bg-danger-muted text-danger",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {allowed ? "Allowed" : "Denied"}
    </span>
  );
}
