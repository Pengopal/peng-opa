import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/**
 * Top of every page: one h1, an optional line under it, actions on the right.
 * `secondaryActions` sit inline from sm up and move into a ⋯ menu on phones (pass DropdownMenuItem-friendly children only if
 * they render well both ways — buttons with `variant="ghost"` work in both).
 */
export function PageHeader({
  title,
  description,
  actions,
  secondaryActions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  secondaryActions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {(actions || secondaryActions) && (
        <div className="flex shrink-0 items-center gap-2">
          {secondaryActions && <div className="hidden items-center gap-2 sm:flex">{secondaryActions}</div>}
          {secondaryActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="sm:hidden" aria-label="More actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="flex flex-col gap-1 p-1 [&_button]:w-full [&_button]:justify-start">
                {secondaryActions}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {actions}
        </div>
      )}
    </header>
  );
}
