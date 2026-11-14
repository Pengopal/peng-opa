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
import { cn } from "@/lib/utils";
import { HOME_PATH } from "./nav";

function initialsOf(name: string) {
  return name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

/** Current workspace with a menu to switch. `bar` is the compact phone top-bar form; `collapsed` shows only the initials tile. */
/** The demo workspace already carries a Demo badge, so its name drops the trailing "(Demo)". */
const shownName = (w: { name: string; isDemo?: boolean }) => (w.isDemo ? w.name.replace(/\s*\(Demo\)$/, "") : w.name);

export function WorkspaceSwitcher({ variant = "sidebar", collapsed = false }: { variant?: "sidebar" | "bar"; collapsed?: boolean }) {
  const { current, list, switchTo } = useWorkspace();
  const navigate = useNavigate();
  const name = current ? shownName(current) : "—";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={`Workspace: ${name}`}
          className={cn(
            "h-auto max-w-full min-w-0 justify-start gap-2.5 px-2 py-1.5",
            variant === "sidebar" && "w-full hover:bg-foreground/5",
            collapsed && "w-auto justify-center px-1.5",
          )}
        >
          <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground text-[11px] font-semibold text-background">
            {initialsOf(name)}
          </span>
          {!collapsed && (
            <>
              <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
                <span className="truncate text-sm font-semibold">{name}</span>
                {current?.isDemo && <span className="text-xs font-normal text-warning">Demo workspace</span>}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Your workspaces</DropdownMenuLabel>
        {list.map((w) => (
          <DropdownMenuItem
            key={w.id}
            onSelect={() => {
              switchTo(w.id);
              void navigate({ to: HOME_PATH });
            }}
          >
            <span className="flex-1 truncate">{shownName(w)}</span>
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
