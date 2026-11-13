import { cn } from "@/lib/utils";

/** The PengOPA split shield: filled half = allow, open half = deny. Takes the current text colour. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={cn("size-6 shrink-0", className)}>
      <path d="M32 6 10 14v18c0 13 9 22 22 27V6Z" fill="currentColor" />
      <path d="M32 6 54 14v18c0 13-9 22-22 27-13-5-22-14-22-27V14L32 6Z" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}

/** PengOPA mark with its wordmark, or the mark alone. */
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
      <LogoMark />
      <span aria-hidden className="text-lg font-semibold tracking-tight">
        Peng<span className="text-primary">OPA</span>
      </span>
    </span>
  );
}
