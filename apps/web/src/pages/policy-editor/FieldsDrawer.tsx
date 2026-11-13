import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FIELD_PATH_PATTERN, OUTCOME_KEY_PATTERN, type FieldType, type Outcome, type RuleSet } from "@peng/shared";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FIELD_TYPE_LABELS, labelFromPath } from "./FieldPicker";

/** Manage what the policy reads (fields) and what it returns besides allow/deny (results). */
export function FieldsDrawer({ open, onOpenChange, ruleSet, onChange, disabled }: { open: boolean; onOpenChange(o: boolean): void; ruleSet: RuleSet; onChange(rs: RuleSet): void; disabled?: boolean }) {
  const [newPath, setNewPath] = useState("");
  const [newKey, setNewKey] = useState("");
  const pathOk = FIELD_PATH_PATTERN.test(newPath) && !ruleSet.fields.some((f) => f.path === newPath);
  const keyOk = OUTCOME_KEY_PATTERN.test(newKey) && !ruleSet.outcomes.some((o) => o.key === newKey);

  const setField = (i: number, patch: Partial<RuleSet["fields"][number]>) =>
    onChange({ ...ruleSet, fields: ruleSet.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const setOutcome = (i: number, patch: Partial<Outcome>) =>
    onChange({ ...ruleSet, outcomes: ruleSet.outcomes.map((o, j) => (j === i ? { ...o, ...patch } : o)) });

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Fields and results" description="Fields are what your systems send. Results are extra values the policy returns.">
      <div className="flex flex-col gap-6">
          <section aria-labelledby="fields-h" className="flex flex-col gap-3">
            <h3 id="fields-h" className="font-medium">Fields</h3>
            {ruleSet.fields.map((f, i) => (
              <div key={f.path} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Input aria-label="Field label" value={f.label} disabled={disabled} onChange={(e) => setField(i, { label: e.target.value })} />
                  <Select disabled={disabled} value={f.type} onValueChange={(t) => setField(i, { type: t as FieldType })}>
                    <SelectTrigger aria-label="Field type" className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {FIELD_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!disabled && (
                    <Button variant="ghost" size="icon" aria-label={`Remove field ${f.label}`} onClick={() => onChange({ ...ruleSet, fields: ruleSet.fields.filter((_, j) => j !== i) })}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
                <code className="text-xs text-muted-foreground">input.{f.path}</code>
                {(f.type === "text" || f.type === "list") && (
                  <Input
                    aria-label={`Allowed values for ${f.label}`}
                    placeholder="Optional: allowed values, comma-separated"
                    disabled={disabled}
                    defaultValue={f.options?.join(", ") ?? ""}
                    onBlur={(e) => {
                      const options = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                      setField(i, { options: options.length ? options : undefined });
                    }}
                  />
                )}
              </div>
            ))}
            {!disabled && (
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!pathOk) return;
                  onChange({ ...ruleSet, fields: [...ruleSet.fields, { path: newPath, label: labelFromPath(newPath), type: "text" }] });
                  setNewPath("");
                }}
              >
                <div className="grid flex-1 gap-1.5">
                  <Label htmlFor="new-field">New field path</Label>
                  <Input id="new-field" placeholder="customer.region" value={newPath} onChange={(e) => setNewPath(e.target.value.trim().toLowerCase())} />
                </div>
                <Button type="submit" variant="outline" disabled={!pathOk}>
                  <Plus aria-hidden /> Add
                </Button>
              </form>
            )}
          </section>
          <Separator />
          <section aria-labelledby="results-h" className="flex flex-col gap-3">
            <h3 id="results-h" className="font-medium">Results</h3>
            {ruleSet.outcomes.length === 0 && <p className="text-sm text-muted-foreground">None yet — e.g. a discount % or a limit.</p>}
            {ruleSet.outcomes.map((o, i) => (
              <div key={o.key} className="flex items-center gap-2">
                <Input aria-label="Result label" value={o.label} disabled={disabled} onChange={(e) => setOutcome(i, { label: e.target.value })} />
                <code className="shrink-0 text-xs text-muted-foreground">{o.key}</code>
                <Select disabled={disabled} value={o.type} onValueChange={(t) => setOutcome(i, { type: t as Outcome["type"] })}>
                  <SelectTrigger aria-label="Result type" className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">text</SelectItem>
                    <SelectItem value="number">number</SelectItem>
                    <SelectItem value="yesno">yes/no</SelectItem>
                  </SelectContent>
                </Select>
                {!disabled && (
                  <Button variant="ghost" size="icon" aria-label={`Remove result ${o.label}`} onClick={() => onChange({ ...ruleSet, outcomes: ruleSet.outcomes.filter((_, j) => j !== i) })}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
            {!disabled && (
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!keyOk) return;
                  onChange({ ...ruleSet, outcomes: [...ruleSet.outcomes, { key: newKey, label: labelFromPath(newKey), type: "number" }] });
                  setNewKey("");
                }}
              >
                <div className="grid flex-1 gap-1.5">
                  <Label htmlFor="new-result">New result key</Label>
                  <Input id="new-result" placeholder="discount" value={newKey} onChange={(e) => setNewKey(e.target.value.trim().toLowerCase())} />
                </div>
                <Button type="submit" variant="outline" disabled={!keyOk}>
                  <Plus aria-hidden /> Add
                </Button>
              </form>
            )}
          </section>
        </div>
    </ResponsiveSheet>
  );
}
