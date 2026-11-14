import type { RuleChange } from "@peng/shared";
import { cn } from "@/lib/utils";

const DOT: Record<RuleChange["kind"], string> = { added: "bg-success", changed: "bg-primary", moved: "bg-muted-foreground/60", removed: "bg-danger" };

/** What happened to a rule between two versions: a coloured dot and the word. */
export function ChangeMark({ kind, className }: { kind: RuleChange["kind"]; className?: string }) {
  return (
    <span data-change={kind} className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground", className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", DOT[kind])} />
      {kind}
    </span>
  );
}
