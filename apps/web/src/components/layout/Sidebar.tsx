import { Link } from "@tanstack/react-router";
import { Activity, FileCheck2, Home, PlugZap, Settings } from "lucide-react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { UserMenu } from "./UserMenu";

export const NAV = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/policies", label: "Policies", icon: FileCheck2, exact: false },
  { to: "/activity", label: "Activity", icon: Activity, exact: false },
  { to: "/connect", label: "Connect", icon: PlugZap, exact: false },
  { to: "/settings", label: "Settings", icon: Settings, exact: false },
] as const;

/** The five sections, workspace switcher on top, account at the bottom. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-4 bg-sidebar p-3 text-sidebar-foreground">
      <WorkspaceSwitcher />
      <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            activeOptions={{ exact }}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
      <UserMenu />
    </div>
  );
}
