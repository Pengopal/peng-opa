import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { BottomTabBar } from "./BottomTabBar";
import { CommandPalette } from "./CommandPalette";
import { EngineBanner } from "./EngineBanner";
import { MobileTopBar } from "./MobileTopBar";
import { MoreSheet } from "./MoreSheet";
import { Sidebar } from "./Sidebar";

const COLLAPSED_KEY = "pengopa.sidebar.collapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Sidebar from lg up; top bar + bottom tab bar below. Pages render in the main column. */
export function AppShell() {
  const { list, isLoading } = useWorkspace();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [search, setSearch] = useState(false);
  const [more, setMore] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => setMore(false), [pathname]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      /* not remembered */
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }
  if (!list.length) return <Navigate to="/onboarding" />;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-svh">
        <aside className={cn("sticky top-0 hidden h-svh shrink-0 transition-[width] duration-200 lg:block", collapsed ? "w-[68px]" : "w-60")}>
          <Sidebar collapsed={collapsed} onToggle={toggle} onSearch={() => setSearch(true)} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar onSearch={() => setSearch(true)} />
          <EngineBanner />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-10">
            <Outlet />
          </main>
        </div>
      </div>
      <BottomTabBar onMore={() => setMore(true)} moreOpen={more} />
      <MoreSheet open={more} onOpenChange={setMore} />
      <CommandPalette open={search} onOpenChange={setSearch} />
    </TooltipProvider>
  );
}
