import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

/** Frame shared by sign-in, sign-up, invite and onboarding: one centred 400px panel, logo above, footer link below. */
export function AuthCard({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <Logo />
      <div className="w-full max-w-[400px] rounded-xl border bg-card p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.08)] sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex flex-col gap-4">{children}</div>
      </div>
      {footer && <div className="text-sm text-muted-foreground">{footer}</div>}
    </main>
  );
}

/** The "or" rule between a social sign-in and the email form. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground" role="separator">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
