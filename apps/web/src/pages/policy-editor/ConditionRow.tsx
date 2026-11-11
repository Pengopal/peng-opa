import { X } from "lucide-react";
import { OPERATOR_LABELS, OPERATORS_BY_TYPE, type Condition, type Field, type Operator, type RuleSet } from "@peng/shared";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldPicker } from "./FieldPicker";
import { defaultValue, ValueInput } from "./ValueInput";

/** One condition: [field] [operator in words] [value that fits the type]. */
export function ConditionRow({
  ruleSet,
  condition,
  onChange,
  onRemove,
  onCreateField,
  disabled,
  error,
}: {
  ruleSet: RuleSet;
  condition: Condition;
  onChange(c: Condition): void;
  onRemove(): void;
  onCreateField(f: Field): void;
  disabled?: boolean;
  error?: string;
}) {
  const field = ruleSet.fields.find((f) => f.path === condition.field);
  const ops = field ? OPERATORS_BY_TYPE[field.type] : [];

  function chooseField(f: Field) {
    const op = OPERATORS_BY_TYPE[f.type].includes(condition.op) ? condition.op : OPERATORS_BY_TYPE[f.type][0];
    onChange({ field: f.path, op, value: defaultValue(f.type, op, f) });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
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
          <Select disabled={disabled} value={condition.op} onValueChange={(op) => onChange({ ...condition, op: op as Operator, value: defaultValue(field.type, op as Operator, field) })}>
            <SelectTrigger aria-label="Operator" className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ops.map((op) => (
                <SelectItem key={op} value={op}>
                  {OPERATOR_LABELS[op]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {field && <ValueInput field={field} condition={condition} disabled={disabled} onChange={(value) => onChange({ ...condition, value })} />}
        {!disabled && (
          <Button variant="ghost" size="icon" aria-label="Remove condition" onClick={onRemove}>
            <X />
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
