import type { Result, RuleSet } from "@peng/shared";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TokenSelect } from "./TokenSelect";

/** "then Allow/Deny with <results>, reason …" — the decision, the values for the policy's results, and the reason callers receive. */
export function ResultEditor({
  ruleSet,
  result,
  onChange,
  disabled,
  idPrefix,
  reasonError,
  lead = "then",
}: {
  ruleSet: RuleSet;
  result: Result;
  onChange(r: Result): void;
  disabled?: boolean;
  idPrefix: string;
  reasonError?: string;
  lead?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <span className="inline-flex w-12 shrink-0 text-sm text-muted-foreground">{lead}</span>
        <div role="radiogroup" aria-label="Decision" className="inline-flex h-8 items-center rounded-md border bg-muted/50 p-0.5">
          {[true, false].map((allowed) => {
            const on = result.allowed === allowed;
            return (
              <button
                key={String(allowed)}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={disabled}
                onClick={() => onChange({ ...result, allowed })}
                className={cn(
                  "flex h-full items-center gap-1.5 rounded-[5px] px-2.5 text-[13px] font-medium transition-colors",
                  on ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span aria-hidden className={cn("size-1.5 rounded-full", on ? (allowed ? "bg-success" : "bg-danger") : "bg-muted-foreground/40")} />
                {allowed ? "Allow" : "Deny"}
              </button>
            );
          })}
        </div>
        {ruleSet.outcomes.map((o) => {
          const id = `${idPrefix}-out-${o.key}`;
          const v = result.outcomes[o.key];
          const set = (value: string | number | boolean | undefined) => {
            const outcomes = { ...result.outcomes };
            if (value === undefined || value === "") delete outcomes[o.key];
            else outcomes[o.key] = value;
            onChange({ ...result, outcomes });
          };
          return (
            <span key={o.key} className="inline-flex items-center gap-1.5">
              <label htmlFor={id} className="text-sm text-muted-foreground">
                {o.label}
              </label>
              {o.type === "yesno" ? (
                <TokenSelect
                  ariaLabel={o.label}
                  disabled={disabled}
                  value={v === undefined ? "unset" : String(v)}
                  options={[
                    { value: "unset", label: "—" },
                    { value: "true", label: "yes" },
                    { value: "false", label: "no" },
                  ]}
                  onChange={(x) => set(x === "unset" ? undefined : x === "true")}
                />
              ) : (
                <Input
                  id={id}
                  type={o.type === "number" ? "number" : "text"}
                  className="h-8 w-24"
                  disabled={disabled}
                  value={v === undefined ? "" : String(v)}
                  onChange={(e) => set(o.type === "number" ? (e.target.value === "" ? undefined : e.target.valueAsNumber) : e.target.value)}
                />
              )}
            </span>
          );
        })}
      </div>
      <div className="flex items-center gap-x-2">
        <label htmlFor={`${idPrefix}-reason`} className="inline-flex w-12 shrink-0 text-sm text-muted-foreground">
          Reason
        </label>
        <Input
          id={`${idPrefix}-reason`}
          value={result.reason}
          disabled={disabled}
          placeholder="Shown to your systems, e.g. “Gold loyalty discount”"
          onChange={(e) => onChange({ ...result, reason: e.target.value })}
          className="h-8 min-w-0 flex-1"
        />
      </div>
      {reasonError && <p className="text-xs text-danger sm:pl-14">{reasonError}</p>}
    </div>
  );
}
