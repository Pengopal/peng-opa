import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Activity as ActivityIcon, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataList, type DataColumn } from "@/components/DataList";
import { DecisionChip } from "@/components/DecisionChip";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { PageHeader } from "@/components/PageHeader";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { api } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { DecisionRow, Page, PolicySummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RANGE_LABEL } from "./date-range";
import { DecisionDetailSheet } from "./DecisionDetailSheet";
import { decisionsQueryString, type DecisionFilters } from "./filters";

const ALL = "all";
const SOURCE_LABEL = { API: "API", PLAYGROUND: "Try-it", DEMO: "Demo" } as const;
const EVENT_LABEL: Record<string, string> = {
  CREATED: "created",
  PUBLISHED: "published",
  ROLLED_BACK: "rolled back",
  PAUSED: "paused",
  RESUMED: "resumed",
  DELETED: "deleted",
};
const RANGES = (["today", "7d", "30d"] as const).map((r) => [r, RANGE_LABEL[r]] as [string, string]);

function initialsOf(name: string) {
  return name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

interface PolicyEvent {
  id: string;
  policyKey: string;
  type: string;
  actorName: string | null;
  fromVersion: number | null;
  toVersion: number | null;
  createdAt: string;
}

/** A compact filter button that shows its current value: "Policy  All ▾". */
function FilterMenu({
  label,
  value,
  onChange,
  options,
  allLabel = "All",
  block,
}: {
  label: string;
  value?: string;
  onChange(v?: string): void;
  options: [string, string][];
  allLabel?: string;
  block?: boolean;
}) {
  const current = options.find(([v]) => v === value)?.[1];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`${label}: ${current ?? allLabel}`} className={cn("h-8 justify-between gap-1.5 font-normal", block && "w-full", current && "border-foreground/30")}>
          <span className="truncate">
            <span className="text-muted-foreground">{label}</span> <span className="font-medium">{current ?? allLabel}</span>
          </span>
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuRadioGroup value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
          <DropdownMenuRadioItem value={ALL}>{allLabel}</DropdownMenuRadioItem>
          {options.map(([v, l]) => (
            <DropdownMenuRadioItem key={v} value={v}>
              {l}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterFields({ filters, setFilters, policies, block }: { filters: DecisionFilters; setFilters(f: DecisionFilters): void; policies: PolicySummary[]; block?: boolean }) {
  // Links from before the presets carry explicit dates; show them as "Custom" until a preset replaces them.
  const custom = !filters.range && (filters.from || filters.to);
  return (
    <div className={cn("flex gap-2", block ? "flex-col" : "flex-wrap items-center")}>
      <FilterMenu
        block={block}
        label="Date"
        allLabel={custom ? "Custom" : RANGE_LABEL.all}
        value={filters.range}
        onChange={(v) => setFilters({ ...filters, range: v as DecisionFilters["range"], from: undefined, to: undefined })}
        options={RANGES}
      />
      <FilterMenu block={block} label="Policy" value={filters.policyId} onChange={(policyId) => setFilters({ ...filters, policyId })} options={policies.map((p) => [p.id, p.name])} />
      <FilterMenu block={block} label="Decision" value={filters.allowed} onChange={(v) => setFilters({ ...filters, allowed: v as DecisionFilters["allowed"] })} options={[["true", "Allowed"], ["false", "Denied"]]} />
      <FilterMenu block={block} label="Source" value={filters.source} onChange={(v) => setFilters({ ...filters, source: v as DecisionFilters["source"] })} options={[["API", "API"], ["PLAYGROUND", "Try-it"], ["DEMO", "Demo"]]} />
    </div>
  );
}

const activeCount = (f: DecisionFilters) => [f.range || f.from || f.to, f.policyId, f.allowed, f.source].filter(Boolean).length;

function ClearLink({ onClick }: { onClick(): void }) {
  return (
    <button type="button" className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={onClick}>
      Clear
    </button>
  );
}

function Decisions({ filters, setFilters }: { filters: DecisionFilters; setFilters(f: DecisionFilters): void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const policies = useQuery({ queryKey: ["policies"], queryFn: () => api<PolicySummary[]>("/api/policies") });
  const decisions = useInfiniteQuery({
    queryKey: ["decisions", filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api<Page<DecisionRow>>(`/api/decisions?${decisionsQueryString(filters, pageParam)}`),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const rows = decisions.data?.pages.flatMap((p) => p.items) ?? [];
  const active = activeCount(filters);
  const clear = () => setFilters({});

  const columns: DataColumn<DecisionRow>[] = [
    {
      header: "When",
      className: "w-36",
      cell: (d) => (
        <time dateTime={d.createdAt} title={formatDateTime(d.createdAt)} className="text-[13px] text-muted-foreground">
          {formatRelative(d.createdAt)}
        </time>
      ),
    },
    { header: "Policy", cell: (d) => <span className="font-medium">{d.policyName}</span> },
    { header: "Decision", cell: (d) => <DecisionChip allowed={d.allowed} /> },
    { header: "Matched rule", hideBelow: "lg", cell: (d) => <span className="text-muted-foreground">{d.matchedRule ?? "No rule matched"}</span> },
    { header: "Source", cell: (d) => <span className="text-muted-foreground">{SOURCE_LABEL[d.source]}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden items-center gap-3 md:flex">
        <FilterFields filters={filters} setFilters={setFilters} policies={policies.data ?? []} />
        {active > 0 && <ClearLink onClick={clear} />}
      </div>
      <div className="flex items-center gap-3 md:hidden">
        <Button variant="outline" size="sm" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal aria-hidden /> Filters
          {active > 0 && (
            <span className="text-muted-foreground" data-numeric>
              {active}
            </span>
          )}
        </Button>
        {active > 0 && <ClearLink onClick={clear} />}
      </div>
      <ResponsiveSheet open={filtersOpen} onOpenChange={setFiltersOpen} title="Filters">
        <FilterFields block filters={filters} setFilters={setFilters} policies={policies.data ?? []} />
      </ResponsiveSheet>
      <ErrorText error={decisions.error} />
      {decisions.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ActivityIcon className="size-8" aria-hidden />}
          title="No decisions here"
          body={active ? "Nothing matches these filters." : "Decisions appear as soon as a policy is tested or called."}
          action={
            active > 0 && (
              <Button variant="outline" size="sm" onClick={clear}>
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <>
          <DataList
            label="Decisions"
            rows={rows}
            rowKey={(d) => d.id}
            columns={columns}
            onOpen={(d) => setOpen(d.id)}
            card={{
              title: (d) => d.policyName,
              meta: (d) => `${formatRelative(d.createdAt)} · ${d.matchedRule ?? "No rule matched"}`,
              trailing: (d) => <DecisionChip allowed={d.allowed} />,
            }}
          />
          {decisions.hasNextPage && (
            <Button variant="outline" size="sm" className="self-center" disabled={decisions.isFetchingNextPage} onClick={() => void decisions.fetchNextPage()}>
              {decisions.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          )}
        </>
      )}
      <DecisionDetailSheet decisionId={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function Changes() {
  const events = useInfiniteQuery({
    queryKey: ["events"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api<Page<PolicyEvent>>(`/api/events${pageParam ? `?cursor=${pageParam}` : ""}`),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const rows = events.data?.pages.flatMap((p) => p.items) ?? [];
  if (events.isLoading) return <Skeleton className="h-48 w-full" />;
  if (!rows.length) return <EmptyState title="No changes yet" body="Creating, publishing, rolling back and pausing policies is recorded here." />;
  return (
    <div className="flex flex-col gap-4">
      <ErrorText error={events.error} />
      <ol className="divide-y border-b">
        {rows.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-3 px-2 py-2.5 text-sm">
            <Avatar className="size-6 shrink-0">
              <AvatarFallback className="bg-muted text-[10px] font-semibold text-foreground">{initialsOf(e.actorName ?? "Someone")}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="font-medium">{e.actorName ?? "Someone"}</span> {EVENT_LABEL[e.type] ?? e.type} <code className="font-mono text-[13px]">{e.policyKey}</code>
              {e.toVersion && <span className="text-muted-foreground"> → v{e.toVersion}</span>}
            </span>
            <time dateTime={e.createdAt} className="text-[13px] text-muted-foreground" title={formatDateTime(e.createdAt)}>
              {formatRelative(e.createdAt)}
            </time>
          </li>
        ))}
      </ol>
      {events.hasNextPage && (
        <Button variant="outline" size="sm" className="self-center" onClick={() => void events.fetchNextPage()}>
          Load more
        </Button>
      )}
    </div>
  );
}

export function Activity() {
  const search = useSearch({ strict: false }) as DecisionFilters & { tab?: "changes" };
  const navigate = useNavigate();
  const { tab, ...filters } = search;
  const setSearch = (next: DecisionFilters & { tab?: "changes" }) => void navigate({ to: "/activity", search: next, replace: true });

  return (
    <>
      <PageHeader title="Activity" description="Every decision your policies made, and every change to them." />
      <Tabs value={tab ?? "decisions"} onValueChange={(t) => setSearch({ ...filters, tab: t === "changes" ? "changes" : undefined })} className="w-full">
        <TabsList variant="line">
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="changes">Changes</TabsTrigger>
        </TabsList>
        <TabsContent value="decisions" className="mt-4 w-full min-w-0">
          <Decisions filters={filters} setFilters={(f) => setSearch({ ...f, tab })} />
        </TabsContent>
        <TabsContent value="changes" className="mt-4 w-full min-w-0">
          <Changes />
        </TabsContent>
      </Tabs>
    </>
  );
}
