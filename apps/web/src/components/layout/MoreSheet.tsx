import { Link } from "@tanstack/react-router";
import { ChevronRight, LogOut } from "lucide-react";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";
import { THEMES, useSignOut, useThemeChoice } from "./UserMenu";

/** Phone "More": the sections that aren't tabs, appearance, and sign out. */
export function MoreSheet({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  const [theme, setTheme] = useThemeChoice();
  const doSignOut = useSignOut();
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="More">
      <nav aria-label="More sections" className="-mx-1 flex flex-col">
        {NAV.filter((n) => !n.mobileTab).map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} onClick={() => onOpenChange(false)} className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-muted">
            <Icon className="size-5 text-muted-foreground" aria-hidden />
            <span className="flex-1">{label}</span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </Link>
        ))}
      </nav>
      <div className="mt-4 border-t pt-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Appearance</p>
        <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex h-10 items-center justify-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground",
                theme === value && "bg-background text-foreground shadow-xs",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>
      <Button variant="outline" className="mt-4 w-full" onClick={() => void doSignOut()}>
        <LogOut aria-hidden /> Sign out
      </Button>
      <p className="mt-4 text-center text-xs text-muted-foreground">PengOPA by Pengopal</p>
    </ResponsiveSheet>
  );
}
