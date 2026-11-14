import { Link } from "@tanstack/react-router";
import { PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { HOME_PATH, NAV, type NavItem } from "./nav";
import { UserMenu } from "./UserMenu";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { to, label, icon: Icon, exact } = item;
  const link = (
    <Link
      to={to}
      activeOptions={{ exact }}
      aria-label={collapsed ? label : undefined}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
        "data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=active]:shadow-xs data-[status=active]:ring-1 data-[status=active]:ring-border/70",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && label}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

/** Desktop sidebar: logo, search, workspace, sections, settings and account. Collapses to an icon rail. */
export function Sidebar({ collapsed, onToggle, onSearch }: { collapsed: boolean; onToggle(): void; onSearch(): void }) {
  const main = NAV.filter((n) => n.group === "main");
  const dev = NAV.filter((n) => n.group === "developers");
  const footer = NAV.filter((n) => n.group === "footer");
  return (
    <div className="flex h-full flex-col gap-3 bg-sidebar p-3 text-sidebar-foreground">
      <div className={cn("flex items-center gap-1", collapsed ? "flex-col" : "justify-between pl-1.5")}>
        <Link to={HOME_PATH} aria-label="PengOPA home" className="rounded-md py-1">
          <Logo variant={collapsed ? "mark" : "full"} />
        </Link>
        <Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="text-muted-foreground">
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>
      <WorkspaceSwitcher collapsed={collapsed} />
      <button
        type="button"
        onClick={onSearch}
        aria-label="Search"
        className={cn(
          "flex h-8 items-center gap-2 rounded-md border bg-background px-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground",
          collapsed && "justify-center px-0",
        )}
      >
        <Search className="size-4 shrink-0" aria-hidden />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">Search</span>
            <kbd className="rounded border bg-muted px-1.5 font-mono text-[10px]">Ctrl K</kbd>
          </>
        )}
      </button>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {main.map((n) => (
          <NavLink key={n.to} item={n} collapsed={collapsed} />
        ))}
        {collapsed ? <div className="my-2 border-t" /> : <p className="mt-4 mb-1 px-2 text-xs font-medium text-muted-foreground">Developers</p>}
        {dev.map((n) => (
          <NavLink key={n.to} item={n} collapsed={collapsed} />
        ))}
      </nav>
      <div className="flex flex-col gap-0.5">
        {footer.map((n) => (
          <NavLink key={n.to} item={n} collapsed={collapsed} />
        ))}
        <div className="mt-1 border-t pt-2">
          <UserMenu compact={collapsed} />
        </div>
        {!collapsed && <p className="px-2 pt-1 text-[11px] text-muted-foreground">by Pengopal</p>}
      </div>
    </div>
  );
}
