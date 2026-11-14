import { Link } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";

const tab = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors";

/** Phone navigation: the most used sections as tabs, everything else under More. */
export function BottomTabBar({ onMore, moreOpen }: { onMore(): void; moreOpen: boolean }) {
  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
    >
      <div className="mx-auto flex max-w-md">
        {NAV.filter((n) => n.mobileTab).map(({ to, label, icon: Icon, exact }) => (
          <Link key={to} to={to} activeOptions={{ exact }} className={cn(tab, "data-[status=active]:text-primary")}>
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
        <button type="button" onClick={onMore} aria-expanded={moreOpen} className={cn(tab, moreOpen && "text-primary")}>
          <MoreHorizontal className="size-5" aria-hidden />
          More
        </button>
      </div>
    </nav>
  );
}
