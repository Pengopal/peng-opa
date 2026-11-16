import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The PengOPA decision square: one tile cut on the diagonal, the filled half a yes and the open half a no.
 * Painted with the Pengopal opal mosaic (the texture pengopal.com uses for its opal type), deepened on light grounds.
 */
export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  const half = `${id}-half`;
  const opal = `${id}-opal`;
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={cn("size-6 shrink-0 [filter:var(--opal-mosaic-dim)]", className)}>
      <defs>
        <pattern id={opal} patternUnits="userSpaceOnUse" width="192" height="64">
          <image href="/brand/opal-mosaic.webp" width="192" height="64" preserveAspectRatio="xMinYMin slice" />
        </pattern>
        <clipPath id={half}>
          <path d="M0 0H64L0 64Z" />
        </clipPath>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="14" fill={`url(#${opal})`} clipPath={`url(#${half})`} />
      <rect x="6" y="6" width="52" height="52" rx="14" stroke={`url(#${opal})`} strokeWidth="5" />
    </svg>
  );
}

/** PengOPA mark with its wordmark ("Peng" in ink, "OPA" in the opal mosaic), or the mark alone. */
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
        Peng<span className="opal-text">OPA</span>
      </span>
    </span>
  );
}
