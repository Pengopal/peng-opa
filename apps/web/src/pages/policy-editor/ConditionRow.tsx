import type { ReactNode } from "react";
import { X } from "lucide-react";
import { OPERATOR_LABELS, OPERATORS_BY_TYPE, type Condition, type Field, type Operator, type RuleSet } from "@peng/shared";
import { Button } from "@/components/ui/button";
import { FieldPicker } from "./FieldPicker";
import { TokenSelect } from "./TokenSelect";
import { defaultValue, ValueInput } from "./ValueInput";

/** One condition as a sentence: [lead] [field] [operator in words] [value that fits the type]. */
export function ConditionRow({
  ruleSet,
  condition,
  onChange,
  onRemove,
  onCreateField,
  disabled,
  error,
  lead,
}: {
  ruleSet: RuleSet;
  condition: Condition;
  onChange(c: Condition): void;
  onRemove(): void;
  onCreateField(f: Field): void;
  disabled?: boolean;
  error?: string;
  /** "When", or the and/or token that joins it to the condition above. */
  lead?: ReactNode;
}) {
  const field = ruleSet.fields.find((f) => f.path === condition.field);
  const ops = field ? OPERATORS_BY_TYPE[field.type] : [];

  function chooseField(f: Field) {
    const op = OPERATORS_BY_TYPE[f.type].includes(condition.op) ? condition.op : OPERATORS_BY_TYPE[f.type][0];
    onChange({ field: f.path, op, value: defaultValue(f.type, op, f) });
  }

  return (
    <div className="group/cond">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {lead && <span className="inline-flex w-12 shrink-0 text-sm text-muted-foreground">{lead}</span>}
        <FieldPicker
          fields={ruleSet.fields}
          value={condition.field}
          disabled={disabled}
          onSelect={(path) => chooseField(ruleSet.fields.find((f) => f.path === path)!)}
          onCreate={(f) => {
            onCreateField(f);
            chooseField(f);
          }}
        />
        {field && (
          <TokenSelect<Operator>
            ariaLabel="Operator"
            disabled={disabled}
            value={condition.op}
            options={ops.map((op) => ({ value: op, label: OPERATOR_LABELS[op] }))}
            onChange={(op) => onChange({ ...condition, op, value: defaultValue(field.type, op, field) })}
            className="font-normal text-muted-foreground"
          />
        )}
        {field && <ValueInput field={field} condition={condition} disabled={disabled} onChange={(value) => onChange({ ...condition, value })} />}
        {!disabled && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove condition"
            className="ml-auto text-muted-foreground opacity-0 group-focus-within/cond:opacity-100 group-hover/cond:opacity-100 [@media(hover:none)]:opacity-100"
            onClick={onRemove}
          >
            <X />
          </Button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger sm:pl-13">{error}</p>}
    </div>
  );
}
