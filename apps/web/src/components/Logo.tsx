import { cn } from "@/lib/utils";

/** Pengopal logo with the product name. `onDark` uses the light-ink version for navy backgrounds. */
export function Logo({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img src={onDark ? "/brand/logo-dark.svg" : "/brand/logo-light.svg"} alt="Pengopal" className="h-7 w-auto" />
      <span className="rounded bg-gold px-1.5 py-0.5 font-heading text-[11px] font-semibold uppercase tracking-wide text-sidebar">OPA</span>
    </span>
  );
}
