import type { Condition, Field, FieldType, Operator } from "@peng/shared";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TokenSelect } from "./TokenSelect";

const LIST_OPS: Operator[] = ["one_of", "not_one_of", "includes_any"];
const DAY_OPS: Operator[] = ["within_last_days", "more_than_days_ago"];

/** A sensible starting value when the field or operator changes. */
export function defaultValue(type: FieldType, op: Operator, field?: Field): unknown {
  if (LIST_OPS.includes(op)) return [];
  if (op === "between") return [0, 100];
  if (DAY_OPS.includes(op)) return 7;
  if (op === "is_empty") return true;
  if (type === "yesno") return true;
  if (type === "number") return 0;
  if (field?.options?.length && (op === "is" || op === "is_not" || op === "includes")) return field.options[0];
  return "";
}

/** Toggle chips for fields with options, a comma-separated box otherwise. */
function ListValue({ field, value, onChange, disabled }: { field: Field; value: string[]; onChange(v: string[]): void; disabled?: boolean }) {
  if (field.options?.length) {
    return (
      <div role="group" aria-label="Value" className="flex flex-wrap gap-1.5">
        {field.options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
              className={cn("rounded-md border px-2 py-0.5 text-[13px] transition-colors", on ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}
            >
              {o}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <Input
      aria-label="Value"
      placeholder="gold, silver"
      disabled={disabled}
      defaultValue={value.join(", ")}
      onBlur={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
      className="h-8 w-48"
    />
  );
}

/** The value control that fits the field type and operator. */
export function ValueInput({ field, condition, onChange, disabled }: { field: Field; condition: Condition; onChange(value: unknown): void; disabled?: boolean }) {
  const { op, value } = condition;

  if (LIST_OPS.includes(op)) return <ListValue field={field} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} disabled={disabled} />;

  if (op === "between") {
    const [min, max] = Array.isArray(value) ? (value as number[]) : [0, 0];
    return (
      <span className="flex items-center gap-2">
        <Input type="number" aria-label="Minimum" className="h-8 w-20" disabled={disabled} value={min} onChange={(e) => onChange([e.target.valueAsNumber, max])} />
        <span className="text-sm text-muted-foreground">and</span>
        <Input type="number" aria-label="Maximum" className="h-8 w-20" disabled={disabled} value={max} onChange={(e) => onChange([min, e.target.valueAsNumber])} />
      </span>
    );
  }

  if (DAY_OPS.includes(op)) {
    return (
      <span className="flex items-center gap-2">
        <Input type="number" min={1} step={1} aria-label="Value" className="h-8 w-20" disabled={disabled} value={Number(value) || ""} onChange={(e) => onChange(e.target.valueAsNumber)} />
        <span className="text-sm text-muted-foreground">days</span>
      </span>
    );
  }

  if (op === "is_empty" || field.type === "yesno") {
    const labels = op === "is_empty" ? ["empty", "not empty"] : ["yes", "no"];
    return (
      <TokenSelect
        ariaLabel="Value"
        disabled={disabled}
        value={value === false ? "false" : "true"}
        options={[{ value: "true", label: labels[0] }, { value: "false", label: labels[1] }]}
        onChange={(v) => onChange(v === "true")}
      />
    );
  }

  if (field.type === "number") {
    return <Input type="number" aria-label="Value" className="h-8 w-24" disabled={disabled} value={typeof value === "number" && !Number.isNaN(value) ? value : ""} onChange={(e) => onChange(e.target.value === "" ? "" : e.target.valueAsNumber)} />;
  }

  if (field.type === "date") {
    return <Input type="date" aria-label="Value" className="h-8 w-40" disabled={disabled} value={String(value ?? "").slice(0, 10)} onChange={(e) => onChange(e.target.value)} />;
  }

  if (field.options?.length && (op === "is" || op === "is_not" || op === "includes")) {
    return <TokenSelect ariaLabel="Value" disabled={disabled} value={String(value ?? "")} options={field.options.map((o) => ({ value: o, label: o }))} onChange={onChange} />;
  }

  return <Input aria-label="Value" className="h-8 w-44" disabled={disabled} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
}
