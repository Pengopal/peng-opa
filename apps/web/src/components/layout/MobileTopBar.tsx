import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { HOME_PATH } from "./nav";
import { UserMenu } from "./UserMenu";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

/** Phone header: mark, workspace switcher, search and account. */
export function MobileTopBar({ onSearch }: { onSearch(): void }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
      <div className="flex h-14 items-center gap-1 px-2">
        <Link to={HOME_PATH} aria-label="PengOPA home" className="flex size-10 shrink-0 items-center justify-center">
          <Logo variant="mark" />
        </Link>
        <div className="flex min-w-0 flex-1">
          <WorkspaceSwitcher variant="bar" />
        </div>
        <Button variant="ghost" size="icon" aria-label="Search" onClick={onSearch}>
          <Search />
        </Button>
        <UserMenu compact />
      </div>
    </header>
  );
}
