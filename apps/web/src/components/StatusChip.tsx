import { Badge } from "@/components/ui/badge";
import type { PolicyStatus } from "@/lib/types";

const LABEL: Record<PolicyStatus, string> = { DRAFT: "Draft", LIVE: "Live", PAUSED: "Paused" };

/** Policy status: Live is filled, Draft and Paused are outlined. */
export function StatusChip({ status }: { status: PolicyStatus }) {
  return (
    <Badge variant={status === "LIVE" ? "default" : status === "PAUSED" ? "secondary" : "outline"}>
      {status === "LIVE" && <span aria-hidden className="size-1.5 rounded-full bg-success" />}
      {LABEL[status]}
    </Badge>
  );
}
