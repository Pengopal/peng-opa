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
import { cn } from "@/lib/utils";

export const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Current theme choice, and a setter that applies and remembers it. */
export function useThemeChoice() {
  const [theme, setTheme] = useState<ThemeChoice>(readTheme);
  const choose = (v: ThemeChoice) => {
    setTheme(v);
    applyTheme(v, true);
  };
  return [theme, choose] as const;
}

/** Signs out, clears cached data and goes to the sign-in page. */
export function useSignOut() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return async () => {
    await signOut();
    qc.clear();
    void navigate({ to: "/sign-in", search: { redirect: undefined } });
  };
}

/** Account menu: theme and sign out. `compact` shows the avatar only (phone top bar, collapsed sidebar). */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { data } = useSession();
  const [theme, setTheme] = useThemeChoice();
  const doSignOut = useSignOut();
  const name = data?.user.name ?? "";
  const email = data?.user.email ?? "";
  const initials = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label="Account"
          className={cn("h-auto gap-3 px-2 py-1.5", compact ? "rounded-full p-1.5" : "w-full justify-start hover:bg-foreground/5")}
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">{initials}</AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="flex min-w-0 flex-col items-start text-left">
              <span className="max-w-full truncate text-sm font-medium">{name}</span>
              <span className="max-w-full truncate text-xs text-muted-foreground">{email}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} className="w-56">
        {compact && (
          <>
            <DropdownMenuLabel className="flex flex-col">
              <span className="truncate">{name}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeChoice)}>
          {THEMES.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon className="size-4" aria-hidden /> {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void doSignOut()}>
          <LogOut className="size-4" aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
