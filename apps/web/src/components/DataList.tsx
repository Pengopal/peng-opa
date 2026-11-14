import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsDesktop } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

export interface DataColumn<T> {
  header: string;
  cell(row: T): ReactNode;
  className?: string;
  /** Hide this column on tablets (md–lg) to keep the table from overflowing. */
  hideBelow?: "lg";
}

/** A list of records: a table from md up, tappable cards below. Clicking a row or card calls `onOpen`. */
export function DataList<T>({
  rows,
  rowKey,
  columns,
  card,
  onOpen,
  rowActions,
  label,
}: {
  rows: T[];
  rowKey(row: T): string;
  columns: DataColumn<T>[];
  card: { title(row: T): ReactNode; meta?(row: T): ReactNode; trailing?(row: T): ReactNode };
  onOpen?(row: T): void;
  rowActions?(row: T): ReactNode;
  label: string;
}) {
  const desktop = useIsDesktop();

  if (!desktop) {
    return (
      <ul aria-label={label} className="-mx-4 divide-y border-b sm:mx-0">
        {rows.map((r) => {
          const body = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{card.title(r)}</span>
                {card.meta && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{card.meta(r)}</span>}
              </span>
              {card.trailing && <span className="shrink-0">{card.trailing(r)}</span>}
            </>
          );
          return (
            <li key={rowKey(r)} className="flex items-center">
              {onOpen ? (
                <button type="button" onClick={() => onOpen(r)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted">
                  {body}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              ) : (
                <div className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-3">{body}</div>
              )}
              {rowActions && <div className="pr-2">{rowActions(r)}</div>}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table aria-label={label}>
        <TableHeader>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            {columns.map((c) => (
              <TableHead key={c.header} className={cn("h-8 text-xs font-medium text-muted-foreground", c.hideBelow === "lg" && "hidden lg:table-cell", c.className)}>
                {c.header}
              </TableHead>
            ))}
            {rowActions && <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={rowKey(r)} className={cn(onOpen && "cursor-pointer")} onClick={onOpen ? () => onOpen(r) : undefined}>
              {columns.map((c, i) => (
                <TableCell key={c.header} className={cn("py-2", c.hideBelow === "lg" && "hidden lg:table-cell", c.className)}>
                  {i === 0 && onOpen ? (
                    <button type="button" className="text-left font-medium hover:underline" onClick={(e) => (e.stopPropagation(), onOpen(r))}>
                      {c.cell(r)}
                    </button>
                  ) : (
                    c.cell(r)
                  )}
                </TableCell>
              ))}
              {rowActions && (
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  {rowActions(r)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
