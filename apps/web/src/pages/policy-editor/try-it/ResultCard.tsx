import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { DecisionChip } from "@/components/DecisionChip";
import type { Rule, RuleSet } from "@peng/shared";
import { outcomeRow } from "@/lib/sentence";
import type { TryResult } from "@/lib/types";

/** "Rule 2 · Big orders" for a draft run; a live run only knows the name. */
function ruleLabel(result: TryResult, rules?: Rule[]) {
  if (result.rule === null) return "No rule — the Otherwise result applied";
  const at = result.target === "draft" ? (rules?.findIndex((r) => r.label === result.rule) ?? -1) : -1;
  return at >= 0 ? `Rule ${at + 1} · ${result.rule}` : result.rule;
}

export function ResultCard({ result, rules, outcomes: defs }: { result: TryResult; rules?: Rule[]; outcomes?: RuleSet["outcomes"] }) {
  const [raw, setRaw] = useState(false);
  const outcomes = Object.entries(result.outcomes);
  return (
    <div className="flex flex-col gap-3 border-t pt-4" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <DecisionChip allowed={result.allowed} className="text-sm" />
        <span className="text-xs text-muted-foreground" data-numeric>
          {result.target === "draft" ? "Draft" : `Live v${result.policy.version}`} · {result.latencyMs} ms
        </span>
      </div>
      <p className="text-sm">“{result.reason}”</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Matched</dt>
        <dd>{ruleLabel(result, rules)}</dd>
        {outcomes.map(([k, v]) => {
          const [label, value] = outcomeRow(k, v, defs);
          return (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          );
        })}
      </dl>
      {result.typeErrors.length > 0 && (
        <p className="rounded-md bg-danger-muted px-3 py-2 text-xs text-danger">
          Wrong type: {result.typeErrors.map((e) => `${e.field} should be ${e.expected}`).join("; ")}. The live API would reject this request.
        </p>
      )}
      {result.missingFields.length > 0 && (
        <p className="text-xs text-muted-foreground">Not sent: {result.missingFields.join(", ")} — conditions on these don't match.</p>
      )}
      <button type="button" onClick={() => setRaw((r) => !r)} className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground" aria-expanded={raw}>
        <ChevronDown className={raw ? "size-3.5 rotate-180" : "size-3.5"} aria-hidden /> Raw JSON
      </button>
      {raw && <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
