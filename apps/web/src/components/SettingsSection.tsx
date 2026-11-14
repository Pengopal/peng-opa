import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A settings block: title and explanation in a 240px column on wide screens, the controls beside it; blocks are separated by rules. */
export function SettingsSection({
  id,
  title,
  description,
  action,
  tone,
  children,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** "danger" keeps the controls in a bordered red panel. */
  tone?: "danger";
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className="grid scroll-mt-20 gap-4 border-b py-8 first:pt-2 last:border-b-0 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <div className="flex items-start justify-between gap-3 lg:block">
        <div>
          <h2 id={id ? `${id}-title` : undefined} className={cn("text-sm font-medium", tone === "danger" && "text-danger")}>
            {title}
          </h2>
          {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0 lg:mt-3">{action}</div>}
      </div>
      <div className={cn("flex min-w-0 flex-col gap-4", tone === "danger" && "rounded-lg border border-danger/40 p-4")}>{children}</div>
    </section>
  );
}
