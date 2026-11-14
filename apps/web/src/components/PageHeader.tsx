import { Fragment, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export interface Crumb {
  label: string;
  to?: string;
}

/** Top of every page: optional breadcrumb, one h1 with an optional status, a line under it, actions on the right. */
export function PageHeader({
  title,
  description,
  breadcrumb,
  status,
  actions,
  compact = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  breadcrumb?: Crumb[];
  status?: ReactNode;
  actions?: ReactNode;
  /** Tighter spacing for working screens where the content below should start high (the policy editor). */
  compact?: boolean;
}) {
  return (
    <header className={compact ? "mb-2 pb-3" : "mb-6 border-b pb-4"}>
      {breadcrumb && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
            {breadcrumb.map((c, i) => (
              <Fragment key={`${c.label}-${i}`}>
                {i > 0 && (
                  <li aria-hidden className="text-muted-foreground/60">
                    /
                  </li>
                )}
                <li className="min-w-0 truncate">
                  {c.to ? (
                    <Link to={c.to} className="transition-colors hover:text-foreground">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-foreground">
                      {c.label}
                    </span>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-balance">{title}</h1>
            {status}
          </div>
          {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
