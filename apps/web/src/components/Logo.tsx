import { useId } from "react";
import { cn } from "@/lib/utils";

/** The PengOPA decision square: one tile cut on the diagonal, the filled half a yes and the open half a no. Drawn in the accent colour. */
export function LogoMark({ className }: { className?: string }) {
  const half = useId();
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={cn("size-6 shrink-0 text-primary", className)}>
      <clipPath id={half}>
        <path d="M0 0H64L0 64Z" />
      </clipPath>
      <rect x="6" y="6" width="52" height="52" rx="14" fill="currentColor" clipPath={`url(#${half})`} />
      <rect x="6" y="6" width="52" height="52" rx="14" stroke="currentColor" strokeWidth="5" />
    </svg>
  );
}

/** PengOPA mark with its wordmark (one ink colour), or the mark alone. */
export function Logo({ variant = "full", className }: { variant?: "full" | "mark"; className?: string }) {
  if (variant === "mark") {
    return (
      <span role="img" aria-label="PengOPA" className={cn("inline-flex text-foreground", className)}>
        <LogoMark />
      </span>
    );
  }
  return (
    <span role="img" aria-label="PengOPA" className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <LogoMark className="size-5" />
      <span aria-hidden className="text-[17px] font-semibold tracking-tight">
        PengOPA
      </span>
    </span>
  );
}
