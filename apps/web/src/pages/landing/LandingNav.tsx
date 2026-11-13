import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export const SECTIONS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#developers", label: "Developers" },
] as const;

/** Landing header: logo, section anchors, sign in and get started. Anchors move into a menu on phones. */
export function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <a href="#top" aria-label="PengOPA home">
          <Logo />
        </a>
        <nav aria-label="Sections" className="hidden flex-1 items-center gap-6 text-sm text-muted-foreground md:flex">
          {SECTIONS.map((s) => (
            <a key={s.href} href={s.href} className="transition-colors hover:text-foreground">
              {s.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/sign-in" search={{ redirect: undefined }}>
              Sign in
            </Link>
          </Button>
          <Button asChild>
            <Link to="/sign-up" search={{ redirect: undefined }}>
              Get started
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu />
          </Button>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-72 p-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <nav aria-label="Sections" className="mt-8 flex flex-col">
            {SECTIONS.map((s) => (
              <a key={s.href} href={s.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-md px-3 text-base font-medium hover:bg-muted">
                {s.label}
              </a>
            ))}
            <Link to="/sign-in" search={{ redirect: undefined }} className="flex min-h-12 items-center rounded-md px-3 text-base font-medium hover:bg-muted">
              Sign in
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
