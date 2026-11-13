import { Activity, FileCheck2, Home, LayoutTemplate, PlugZap, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: "/home" | "/policies" | "/templates" | "/activity" | "/connect" | "/settings";
  label: string;
  icon: LucideIcon;
  exact: boolean;
  /** Where the sidebar shows it. */
  group: "main" | "developers" | "footer";
  /** Shown as a tab in the phone bottom bar (the rest live under More). */
  mobileTab: boolean;
}

/** The dashboard. `/` is the public landing page. */
export const HOME_PATH = "/home" as const;

/** The one list of app sections: sidebar, bottom tab bar, More sheet and ⌘K palette all read it. */
export const NAV: NavItem[] = [
  { to: HOME_PATH, label: "Home", icon: Home, exact: true, group: "main", mobileTab: true },
  { to: "/policies", label: "Policies", icon: FileCheck2, exact: false, group: "main", mobileTab: true },
  { to: "/templates", label: "Templates", icon: LayoutTemplate, exact: false, group: "main", mobileTab: false },
  { to: "/activity", label: "Activity", icon: Activity, exact: false, group: "main", mobileTab: true },
  { to: "/connect", label: "Connect", icon: PlugZap, exact: false, group: "developers", mobileTab: false },
  { to: "/settings", label: "Settings", icon: Settings, exact: false, group: "footer", mobileTab: false },
];
