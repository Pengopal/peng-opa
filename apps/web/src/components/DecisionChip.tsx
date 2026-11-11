import { cn } from "@/lib/utils";

/** The one way the app shows a decision: ✅ Allowed / ⛔ Denied, in the theme's success/danger colours. */
export function DecisionChip({ allowed, className }: { allowed: boolean; className?: string }) {
  return (
    <span
      data-slot="decision-chip"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        allowed ? "bg-success-muted text-success" : "bg-danger-muted text-danger",
        className,
      )}
    >
      <span aria-hidden>{allowed ? "✅" : "⛔"}</span>
      {allowed ? "Allowed" : "Denied"}
    </span>
  );
}
