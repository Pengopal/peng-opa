import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, FileCheck2, Moon, Plus, Sun } from "lucide-react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { api } from "@/lib/api";
import type { PolicySummary } from "@/lib/types";
import { can, useWorkspace } from "@/lib/workspace";
import { HOME_PATH, NAV } from "./nav";
import { useThemeChoice } from "./UserMenu";

/** ⌘K / Ctrl K: jump to a section or policy, create a policy, switch workspace, flip the theme. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  const navigate = useNavigate();
  const { current, list, switchTo } = useWorkspace();
  const [theme, setTheme] = useThemeChoice();
  const policies = useQuery({ queryKey: ["policies"], queryFn: () => api<PolicySummary[]>("/api/policies"), enabled: open });
  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };
  const dark = theme === "dark";

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Jump to a page, policy or action">
      <Command>
        <CommandInput placeholder="Search pages, policies and actions" />
        <CommandList>
          <CommandEmpty>Nothing matches that.</CommandEmpty>
          <CommandGroup heading="Pages">
            {NAV.map(({ to, label, icon: Icon }) => (
              <CommandItem key={to} value={`page ${label}`} onSelect={() => run(() => void navigate({ to }))}>
                <Icon aria-hidden /> {label}
              </CommandItem>
            ))}
          </CommandGroup>
          {!!policies.data?.length && (
            <CommandGroup heading="Policies">
              {policies.data.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`policy ${p.name} ${p.key}`}
                  onSelect={() => run(() => void navigate({ to: "/policies/$policyId", params: { policyId: p.id }, search: {} }))}
                >
                  <FileCheck2 aria-hidden /> {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="Actions">
            {can(current?.role, "EDITOR") && (
              <CommandItem value="action new policy" onSelect={() => run(() => void navigate({ to: "/templates" }))}>
                <Plus aria-hidden /> New policy
              </CommandItem>
            )}
            <CommandItem value="action toggle theme dark light" onSelect={() => run(() => setTheme(dark ? "light" : "dark"))}>
              {dark ? <Sun aria-hidden /> : <Moon aria-hidden />} {dark ? "Switch to light theme" : "Switch to dark theme"}
            </CommandItem>
          </CommandGroup>
          {list.length > 1 && (
            <CommandGroup heading="Workspaces">
              {list
                .filter((w) => w.id !== current?.id)
                .map((w) => (
                  <CommandItem
                    key={w.id}
                    value={`workspace ${w.name}`}
                    onSelect={() =>
                      run(() => {
                        switchTo(w.id);
                        void navigate({ to: HOME_PATH });
                      })
                    }
                  >
                    <Building2 aria-hidden /> Switch to {w.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
