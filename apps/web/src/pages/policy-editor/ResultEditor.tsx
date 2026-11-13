import { CircleCheck, CircleX } from "lucide-react";
import type { Result, RuleSet } from "@peng/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** "Then": Allow/Deny, the reason the caller receives, and values for the policy's results. */
export function ResultEditor({
  ruleSet,
  result,
  onChange,
  disabled,
  idPrefix,
  reasonError,
}: {
  ruleSet: RuleSet;
  result: Result;
  onChange(r: Result): void;
  disabled?: boolean;
  idPrefix: string;
  reasonError?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div role="radiogroup" aria-label="Decision" className="inline-flex rounded-lg border bg-muted/40 p-0.5">
          {[true, false].map((allowed) => (
            <button
              key={String(allowed)}
              type="button"
              role="radio"
              aria-checked={result.allowed === allowed}
              disabled={disabled}
              onClick={() => onChange({ ...result, allowed })}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                result.allowed === allowed ? (allowed ? "bg-success-muted text-success" : "bg-danger-muted text-danger") : "text-muted-foreground hover:bg-muted",
              )}
            >
              {allowed ? <CircleCheck className="size-4" aria-hidden /> : <CircleX className="size-4" aria-hidden />}
              {allowed ? "Allow" : "Deny"}
            </button>
          ))}
        </div>
        <div className="grid min-w-48 flex-1 gap-1.5">
          <Label htmlFor={`${idPrefix}-reason`} className="text-xs text-muted-foreground">
            Reason
          </Label>
          <Input id={`${idPrefix}-reason`} value={result.reason} disabled={disabled} placeholder="Shown to your systems, e.g. “Gold loyalty discount”" onChange={(e) => onChange({ ...result, reason: e.target.value })} />
        </div>
      </div>
      {reasonError && <p className="text-xs text-danger">{reasonError}</p>}
      {ruleSet.outcomes.length > 0 && (
        <div className="flex flex-wrap gap-3">
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
              <div key={o.key} className="grid gap-1.5">
                <Label htmlFor={id} className="text-xs text-muted-foreground">
                  {o.label}
                </Label>
                {o.type === "yesno" ? (
                  <Select disabled={disabled} value={v === undefined ? "unset" : String(v)} onValueChange={(x) => set(x === "unset" ? undefined : x === "true")}>
                    <SelectTrigger id={id} className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">—</SelectItem>
                      <SelectItem value="true">yes</SelectItem>
                      <SelectItem value="false">no</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={id}
                    type={o.type === "number" ? "number" : "text"}
                    className="w-32"
                    disabled={disabled}
                    value={v === undefined ? "" : String(v)}
                    onChange={(e) => set(o.type === "number" ? (e.target.value === "" ? undefined : e.target.valueAsNumber) : e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
