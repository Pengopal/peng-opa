import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import type { Sample } from "@/lib/types";

/** Load a saved sample input, or save the current one (editors). */
export function SamplesMenu({ policyId, current, onLoad, canSave }: { policyId: string; current: unknown; onLoad(input: unknown): void; canSave: boolean }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: samples = [] } = useQuery({ queryKey: ["samples", policyId], queryFn: () => api<Sample[]>(`/api/policies/${policyId}/samples`) });
  const save = useMutation({
    mutationFn: () => api(`/api/policies/${policyId}/samples`, { method: "POST", body: { name: name.trim(), input: current } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["samples", policyId] });
      toast.success("Sample saved");
      setName("");
      setSaving(false);
    },
  });

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={!samples.length}>
            Samples <ChevronDown aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Load a sample</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {samples.map((s) => (
            <DropdownMenuItem key={s.id} onSelect={() => onLoad(s.input)}>
              {s.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {canSave && (
        <Popover open={saving} onOpenChange={setSaving}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Save as sample">
              <BookmarkPlus />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) save.mutate();
              }}
            >
              <Input aria-label="Sample name" placeholder="e.g. Gold, $250" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <Button type="submit" size="sm" disabled={!name.trim() || save.isPending}>
                Save
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
