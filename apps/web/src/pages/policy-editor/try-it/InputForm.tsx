import type { Field } from "@peng/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FormValues } from "./input";

const NONE = "__none__";

/** One input per policy field, typed to match; empty means "not sent". */
export function InputForm({ fields, values, onChange }: { fields: Field[]; values: FormValues; onChange(v: FormValues): void }) {
  const set = (path: string, v: string) => onChange({ ...values, [path]: v });
  if (!fields.length) return <p className="text-sm text-muted-foreground">Add a field to a rule to start testing.</p>;

  return (
    <div className="grid gap-3">
      {fields.map((f) => {
        const id = `try-${f.path}`;
        const v = values[f.path] ?? "";
        const choice = f.type === "yesno" ? ["true", "false"] : f.type === "text" ? f.options : undefined;
        return (
          <div key={f.path} className="grid gap-1.5">
            <Label htmlFor={id} className="flex items-baseline justify-between gap-2">
              <span>{f.label}</span>
              <code className="truncate text-[11px] font-normal text-muted-foreground">{f.path}</code>
            </Label>
            {choice?.length ? (
              <Select value={v || NONE} onValueChange={(x) => set(f.path, x === NONE ? "" : x)}>
                <SelectTrigger id={id} aria-label={f.label} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not sent</SelectItem>
                  {choice.map((o) => (
                    <SelectItem key={o} value={o}>
                      {f.type === "yesno" ? (o === "true" ? "yes" : "no") : o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={id}
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                placeholder={f.type === "list" ? "a, b, c" : "Not sent"}
                value={v}
                onChange={(e) => set(f.path, e.target.value)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
