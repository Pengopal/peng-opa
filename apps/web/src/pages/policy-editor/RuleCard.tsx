import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { Field, Issue, Rule, RuleSet } from "@peng/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ConditionRow } from "./ConditionRow";
import { ResultEditor } from "./ResultEditor";
import { TokenSelect } from "./TokenSelect";

const issueAt = (issues: Issue[], path: string) => issues.find((i) => i.path === path || i.path.startsWith(`${path}.`))?.message;

/** One rule as a divided row that reads as a sentence: "When … and … then Allow …". Draggable by its handle; first match wins. */
export function RuleCard({
  rule,
  index,
  ruleSet,
  issues,
  onChange,
  onRemove,
  onCreateField,
  disabled,
  matched,
}: {
  rule: Rule;
  index: number;
  ruleSet: RuleSet;
  issues: Issue[];
  onChange(r: Rule): void;
  onRemove(): void;
  onCreateField(f: Field): void;
  disabled?: boolean;
  /** The last draft Try-it run stopped at this rule. */
  matched?: boolean;
}) {
  const sortable = useSortable({ id: rule.id, disabled });
  const base = `rules[${index}]`;
  const warning = issues.find((i) => i.path === base && i.severity === "warning")?.message;
  const joiner = (
    <TokenSelect<Rule["match"]>
      ariaLabel="Match"
      disabled={disabled}
      value={rule.match}
      options={[
        { value: "all", label: "and" },
        { value: "any", label: "or" },
      ]}
      onChange={(match) => onChange({ ...rule, match })}
      className="-ml-1.5 font-normal text-muted-foreground"
    />
  );

  return (
    <article
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}
      aria-label={`Rule ${index + 1}: ${rule.label}`}
      data-matched={matched ? "true" : undefined}
      data-rule-id={rule.id}
      className={cn(
        "group/rule grid scroll-my-24 grid-cols-[2.5rem_minmax(0,1fr)] gap-y-3 bg-background py-4 pr-3 transition-colors duration-200 ease-out",
        sortable.isDragging && "relative z-10 shadow-lg",
        matched && "bg-primary/[0.06]",
      )}
    >
      <div className="flex flex-col items-center gap-1 pt-1">
        <span className="text-[13px] font-medium text-muted-foreground" data-numeric>
          {index + 1}
        </span>
        {!disabled && (
          <button
            type="button"
            className="cursor-grab touch-none rounded-sm p-0.5 text-muted-foreground/60 hover:text-foreground"
            aria-label={`Drag to reorder rule ${index + 1}`}
            {...sortable.attributes}
            {...sortable.listeners}
          >
            <GripVertical className="size-4" />
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <Input
            aria-label="Rule name"
            value={rule.label}
            disabled={disabled}
            onChange={(e) => onChange({ ...rule, label: e.target.value })}
            className="h-8 min-w-0 flex-1 border-transparent px-1.5 font-medium shadow-none hover:border-input focus-visible:border-input"
          />
          {matched && <span className="shrink-0 text-xs font-medium text-primary">Matched</span>}
          {!disabled && (
            <Button variant="ghost" size="icon-sm" aria-label={`Delete rule ${index + 1}`} className="text-muted-foreground" onClick={onRemove}>
              <Trash2 />
            </Button>
          )}
        </div>
        {warning && <p className="text-xs text-warning">{warning}</p>}

        <div className="flex flex-col gap-1.5 pl-1.5">
          {rule.conditions.map((c, ci) => (
            <ConditionRow
              key={ci}
              lead={ci === 0 ? "When" : joiner}
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
              className="ml-12 self-start text-muted-foreground"
              onClick={() => onChange({ ...rule, conditions: [...rule.conditions, { field: ruleSet.fields[0]?.path ?? "", op: "is", value: "" }] })}
            >
              <Plus aria-hidden /> Add condition
            </Button>
          )}
        </div>

        <div className="pl-1.5">
          <ResultEditor
            ruleSet={ruleSet}
            result={rule.result}
            disabled={disabled}
            idPrefix={`rule-${rule.id}`}
            reasonError={issueAt(issues, `${base}.result`)}
            onChange={(result) => onChange({ ...rule, result })}
          />
        </div>
      </div>
    </article>
  );
}
