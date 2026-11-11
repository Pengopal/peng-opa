import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/lib/workspace";

export function WorkspaceSwitcher() {
  const { current, list, switchTo } = useWorkspace();
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto w-full justify-between px-3 py-2">
          <span className="flex min-w-0 flex-col items-start">
            <span className="text-xs text-muted-foreground">Workspace</span>
            <span className="flex max-w-full items-center gap-2 truncate font-semibold">
              <span className="truncate">{current?.name ?? "—"}</span>
              {current?.isDemo && <Badge variant="secondary">Demo</Badge>}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Your workspaces</DropdownMenuLabel>
        {list.map((w) => (
          <DropdownMenuItem
            key={w.id}
            onSelect={() => {
              switchTo(w.id);
              void navigate({ to: "/" });
            }}
          >
            <span className="flex-1 truncate">{w.name}</span>
            {w.isDemo && <Badge variant="secondary">Demo</Badge>}
            {w.id === current?.id && <Check className="size-4" aria-label="Current" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate({ to: "/onboarding" })}>
          <Plus className="size-4" aria-hidden />
          New workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
