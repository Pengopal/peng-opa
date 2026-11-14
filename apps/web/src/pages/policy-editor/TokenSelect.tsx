import { useState } from "react";
import { Check } from "lucide-react";
import { Command, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Shared look of an inline sentence token: the word itself, dotted underline, quiet hover. */
export const tokenClass =
  "inline-flex h-7 max-w-full items-center rounded-md px-1.5 text-sm font-medium underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:no-underline aria-expanded:bg-muted";

/** A word in a rule sentence that opens a short list of choices. */
export function TokenSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  disabled,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange(v: T): void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" role="combobox" aria-expanded={open} aria-label={ariaLabel} disabled={disabled} className={cn(tokenClass, className)}>
          <span className="truncate">{current?.label ?? "Choose"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] min-w-40 p-0" align="start" collisionPadding={16}>
        <Command value={current?.label}>
          <CommandList>
            {options.map((o) => (
              <CommandItem
                key={o.value}
                value={o.label}
                onSelect={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <Check className={cn("size-4", o.value === value ? "opacity-100" : "opacity-0")} aria-hidden />
                {o.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
