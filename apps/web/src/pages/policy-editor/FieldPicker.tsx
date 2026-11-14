import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { FIELD_PATH_PATTERN, type Field, type FieldType } from "@peng/shared";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { tokenClass } from "./TokenSelect";

export const FIELD_TYPE_LABELS: Record<FieldType, string> = { text: "text", number: "number", yesno: "yes/no", date: "date", list: "list" };

/** "customer.first_order" → "Customer first order" */
export const labelFromPath = (path: string) => {
  const words = path.replace(/[._]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Choose one of the policy's fields, or type a new path and create it inline with a type. */
export function FieldPicker({
  fields,
  value,
  onSelect,
  onCreate,
  disabled,
}: {
  fields: Field[];
  value: string;
  onSelect(path: string): void;
  onCreate(field: Field): void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = fields.find((f) => f.path === value);
  const typed = query.trim().toLowerCase();
  const canCreate = FIELD_PATH_PATTERN.test(typed) && !fields.some((f) => f.path === typed);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" role="combobox" aria-expanded={open} aria-label="Field" disabled={disabled} className={tokenClass}>
          <span className={cn("truncate", !current && "text-muted-foreground")}>{current?.label ?? (value || "Choose a field")}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 max-w-[calc(100vw-2rem)] p-0" align="start" collisionPadding={16}>
        <Command shouldFilter>
          <CommandInput placeholder="Search or type a new field (e.g. customer.region)" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{canCreate ? "No such field yet." : "Type a path like customer.tier"}</CommandEmpty>
            {fields.length > 0 && (
              <CommandGroup heading="Fields">
                {fields.map((f) => (
                  <CommandItem
                    key={f.path}
                    value={`${f.label} ${f.path}`}
                    onSelect={() => {
                      onSelect(f.path);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("size-4", f.path === value ? "opacity-100" : "opacity-0")} aria-hidden />
                    <span className="flex-1 truncate">{f.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">{f.path}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {canCreate && (
              <CommandGroup heading="Create">
                {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((type) => (
                  <CommandItem
                    key={type}
                    value={`create ${typed} ${type}`}
                    onSelect={() => {
                      onCreate({ path: typed, label: labelFromPath(typed), type });
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <Plus className="size-4" aria-hidden />
                    Create field “{typed}” as {FIELD_TYPE_LABELS[type]}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
