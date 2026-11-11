import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { Field, Issue, Rule, RuleSet } from "@peng/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConditionRow } from "./ConditionRow";
import { ResultEditor } from "./ResultEditor";

const issueAt = (issues: Issue[], path: string) => issues.find((i) => i.path === path || i.path.startsWith(`${path}.`))?.message;

/** One rule: "When ALL/ANY of … Then …". Draggable by its handle; first match wins. */
export function RuleCard({
  rule,
  index,
  ruleSet,
  issues,
  onChange,
  onRemove,
  onCreateField,
  disabled,
}: {
  rule: Rule;
  index: number;
  ruleSet: RuleSet;
  issues: Issue[];
  onChange(r: Rule): void;
  onRemove(): void;
  onCreateField(f: Field): void;
  disabled?: boolean;
}) {
  const sortable = useSortable({ id: rule.id, disabled });
  const base = `rules[${index}]`;
  const warning = issues.find((i) => i.path === base && i.severity === "warning")?.message;

  return (
    <Card
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}
      className={sortable.isDragging ? "relative z-10 shadow-lg" : undefined}
      aria-label={`Rule ${index + 1}: ${rule.label}`}
    >
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          {!disabled && (
            <button type="button" className="cursor-grab touch-none text-muted-foreground" aria-label={`Drag to reorder rule ${index + 1}`} {...sortable.attributes} {...sortable.listeners}>
              <GripVertical className="size-4" />
            </button>
          )}
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span>
          <Input aria-label="Rule name" value={rule.label} disabled={disabled} onChange={(e) => onChange({ ...rule, label: e.target.value })} className="h-8 border-transparent px-2 font-medium shadow-none hover:border-input focus-visible:border-input" />
          {!disabled && (
            <Button variant="ghost" size="icon" aria-label={`Delete rule ${index + 1}`} onClick={onRemove}>
              <Trash2 />
            </Button>
          )}
        </div>
        {warning && <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">⚠ {warning}</p>}

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">When</span>
            <Select disabled={disabled} value={rule.match} onValueChange={(m) => onChange({ ...rule, match: m as Rule["match"] })}>
              <SelectTrigger aria-label="Match" size="sm" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ALL</SelectItem>
                <SelectItem value="any">ANY</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">of these are true</span>
          </div>
          <div className="flex flex-col gap-2 border-l-2 pl-3">
            {rule.conditions.map((c, ci) => (
              <ConditionRow
                key={ci}
                ruleSet={ruleSet}
                condition={c}
                disabled={disabled}
                error={issueAt(issues, `${base}.conditions[${ci}]`)}
                onCreateField={onCreateField}
                onChange={(nc) => onChange({ ...rule, conditions: rule.conditions.map((x, i) => (i === ci ? nc : x)) })}
                onRemove={() => onChange({ ...rule, conditions: rule.conditions.filter((_, i) => i !== ci) })}
              />
            ))}
            {issueAt(issues, `${base}.conditions`) && rule.conditions.length === 0 && <p className="text-xs text-danger">{issueAt(issues, `${base}.conditions`)}</p>}
            {!disabled && (
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => onChange({ ...rule, conditions: [...rule.conditions, { field: ruleSet.fields[0]?.path ?? "", op: "is", value: "" }] })}
              >
                <Plus aria-hidden /> Add condition
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Then</span>
          <ResultEditor
            ruleSet={ruleSet}
            result={rule.result}
            disabled={disabled}
            idPrefix={`rule-${rule.id}`}
            reasonError={issueAt(issues, `${base}.result`)}
            onChange={(result) => onChange({ ...rule, result })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
