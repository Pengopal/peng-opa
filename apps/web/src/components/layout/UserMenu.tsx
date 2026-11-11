import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth";
import { applyTheme, readTheme, type ThemeChoice } from "@/lib/theme";

export function UserMenu() {
  const { data } = useSession();
  const [theme, setTheme] = useState<ThemeChoice>(readTheme);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const name = data?.user.name ?? "";
  const initials = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto w-full justify-start gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <Avatar className="size-7">
            <AvatarFallback className="bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-col items-start text-left">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="truncate text-xs text-sidebar-foreground/60">{data?.user.email}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(v) => {
            setTheme(v as ThemeChoice);
            applyTheme(v as ThemeChoice, true);
          }}
        >
          <DropdownMenuRadioItem value="light">
            <Sun className="size-4" aria-hidden /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="size-4" aria-hidden /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="size-4" aria-hidden /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            qc.clear();
            void navigate({ to: "/sign-in", search: { redirect: undefined } });
          }}
        >
          <LogOut className="size-4" aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
