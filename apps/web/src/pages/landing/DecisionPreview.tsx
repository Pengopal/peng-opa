import type { ReactNode } from "react";
import { DecisionChip } from "@/components/DecisionChip";
import { cn } from "@/lib/utils";

/** A word in a rule sentence, styled like the editor's token pickers but not interactive. */
function Token({ children }: { children: ReactNode }) {
  return <span className="font-medium underline decoration-muted-foreground/60 decoration-dotted underline-offset-4">{children}</span>;
}

/** The Checkout discount template's rules, in order, as the editor writes them. */
const RULES: { n: string; sentence: ReactNode; matched?: boolean }[] = [
  {
    n: "1",
    matched: true,
    sentence: (
      <>
        When <Token>Customer tier</Token> is <Token>gold</Token> and <Token>Order total</Token> is at least <Token>200</Token>, allow with <Token>15</Token>% discount
      </>
    ),
  },
  {
    n: "2",
    sentence: (
      <>
        When <Token>First order</Token> is <Token>yes</Token>, allow with <Token>10</Token>% discount
      </>
    ),
  },
  {
    n: "3",
    sentence: (
      <>
        When <Token>Customer tier</Token> is <Token>silver</Token> and <Token>Order total</Token> is at least <Token>100</Token>, allow with <Token>5</Token>% discount
      </>
    ),
  },
];

function Step({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid border-b last:border-b-0 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
      <dt className="px-4 pt-3 text-xs text-muted-foreground sm:border-r sm:py-3.5">{label}</dt>
      <dd className="min-w-0 px-4 pt-1 pb-3 sm:py-3">{children}</dd>
    </div>
  );
}

/**
 * One real decision explaining itself, top to bottom: the input, the rules checked in order (the matched one
 * marked, the ones after it never reached), the answer with its reason, and the call that asked for it.
 * Demo data from the Checkout discount template.
 */
export function DecisionPreview({ className }: { className?: string }) {
  return (
    <figure className={cn("min-w-0", className)}>
      <dl aria-label="Example decision" className="overflow-hidden rounded-lg border bg-card text-sm">
        <Step label="Input">
          <code className="block font-mono text-[12.5px] leading-relaxed break-words text-muted-foreground">
            {'{ "customer": { "tier": "gold", "first_order": false }, "order": { "total": 250 } }'}
          </code>
        </Step>
        <Step label="Rules, in order">
          <ol className="-mx-4 divide-y">
            {RULES.map((r) => (
              <li
                key={r.n}
                data-matched={r.matched || undefined}
                className={cn("grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2 px-4 py-2.5 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto]", r.matched ? "bg-primary/[0.06]" : "text-muted-foreground")}
              >
                <span className="pt-px font-mono text-xs text-muted-foreground tabular-nums">{r.n}</span>
                <span className={cn("leading-relaxed", !r.matched && "opacity-70")}>{r.sentence}</span>
                <span className={cn("col-start-2 text-xs sm:col-start-3 sm:pt-0.5", r.matched ? "font-medium text-primary" : "text-muted-foreground")}>
                  {r.matched ? "Matched" : "Not reached"}
                </span>
              </li>
            ))}
            <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2 px-4 py-2.5 text-muted-foreground">
              <span className="pt-px font-mono text-xs">—</span>
              <span className="opacity-70">Otherwise, deny: “No discount applies”</span>
            </li>
          </ol>
        </Step>
        <Step label="Answer">
          <p className="flex flex-wrap items-center gap-x-2">
            <DecisionChip allowed className="text-sm" />
            <span className="font-medium">15% discount</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">“Gold loyalty discount” · Rule 1 · Checkout discount v1</p>
        </Step>
        <Step label="Call">
          <code className="font-mono text-[12.5px] text-muted-foreground">POST /v1/decide/checkout-discount</code>
        </Step>
      </dl>
      <figcaption className="mt-3 text-xs text-muted-foreground">Demo data from the Checkout discount template.</figcaption>
    </figure>
  );
}
