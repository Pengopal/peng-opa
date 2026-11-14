import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Activity as ActivityIcon, SlidersHorizontal, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function FilterSelect({ label, value, onChange, options }: { label: string; value?: string; onChange(v?: string): void; options: [string, string][] }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
        <SelectTrigger aria-label={label} className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterFields({ filters, setFilters, policies }: { filters: DecisionFilters; setFilters(f: DecisionFilters): void; policies: PolicySummary[] }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <FilterSelect label="Policy" value={filters.policyId} onChange={(policyId) => setFilters({ ...filters, policyId })} options={policies.map((p) => [p.id, p.name])} />
      <FilterSelect label="Decision" value={filters.allowed} onChange={(v) => setFilters({ ...filters, allowed: v as DecisionFilters["allowed"] })} options={[["true", "Allowed"], ["false", "Denied"]]} />
      <FilterSelect label="Source" value={filters.source} onChange={(v) => setFilters({ ...filters, source: v as DecisionFilters["source"] })} options={[["API", "API"], ["PLAYGROUND", "Try-it"], ["DEMO", "Demo"]]} />
      <div className="grid gap-1.5">
        <Label htmlFor="f-from" className="text-xs text-muted-foreground">
          From
        </Label>
        <Input id="f-from" type="date" className="w-full sm:w-40" value={filters.from ?? ""} onChange={(e) => setFilters({ ...filters, from: e.target.value || undefined })} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="f-to" className="text-xs text-muted-foreground">
          To
        </Label>
        <Input id="f-to" type="date" className="w-full sm:w-40" value={filters.to ?? ""} onChange={(e) => setFilters({ ...filters, to: e.target.value || undefined })} />
      </div>
    </div>
  );
}

function activeChips(filters: DecisionFilters, policies: PolicySummary[]): { key: keyof DecisionFilters; label: string }[] {
  const chips: { key: keyof DecisionFilters; label: string }[] = [];
  if (filters.policyId) chips.push({ key: "policyId", label: policies.find((p) => p.id === filters.policyId)?.name ?? filters.policyId });
  if (filters.allowed) chips.push({ key: "allowed", label: filters.allowed === "true" ? "Allowed" : "Denied" });
  if (filters.source) chips.push({ key: "source", label: SOURCE_LABEL[filters.source] });
  if (filters.from) chips.push({ key: "from", label: `From ${filters.from}` });
  if (filters.to) chips.push({ key: "to", label: `To ${filters.to}` });
  return chips;
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
  const chips = activeChips(filters, policies.data ?? []);

  const columns: DataColumn<DecisionRow>[] = [
    { header: "When", cell: (d) => <span title={formatDateTime(d.createdAt)}>{formatRelative(d.createdAt)}</span> },
    { header: "Policy", cell: (d) => d.policyName },
    { header: "Decision", cell: (d) => <DecisionChip allowed={d.allowed} /> },
    { header: "Matched rule", hideBelow: "lg", cell: (d) => <span className="text-muted-foreground">{d.matchedRule ?? "—"}</span> },
    { header: "Source", cell: (d) => <span className="text-muted-foreground">{SOURCE_LABEL[d.source]}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden md:block">
        <FilterFields filters={filters} setFilters={setFilters} policies={policies.data ?? []} />
      </div>
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        <Button variant="outline" size="sm" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal aria-hidden /> Filters {chips.length > 0 && <Badge variant="secondary">{chips.length}</Badge>}
        </Button>
        {chips.map((c) => (
          <Badge key={c.key} variant="secondary" className="gap-1 pr-1">
            {c.label}
            <button type="button" aria-label={`Remove filter ${c.label}`} className="rounded-full p-0.5 hover:bg-muted-foreground/20" onClick={() => setFilters({ ...filters, [c.key]: undefined })}>
              <X className="size-3" aria-hidden />
            </button>
          </Badge>
        ))}
      </div>
      <ResponsiveSheet open={filtersOpen} onOpenChange={setFiltersOpen} title="Filters">
        <FilterFields filters={filters} setFilters={setFilters} policies={policies.data ?? []} />
      </ResponsiveSheet>
      <ErrorText error={decisions.error} />
      {decisions.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<ActivityIcon className="size-8" aria-hidden />} title="No decisions here" body="Decisions appear as soon as a policy is tested or called. Try clearing the filters." />
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
            <Button variant="outline" className="self-center" disabled={decisions.isFetchingNextPage} onClick={() => void decisions.fetchNextPage()}>
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
  if (events.isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!rows.length) return <EmptyState title="No changes yet" body="Creating, publishing, rolling back and pausing policies is recorded here." />;
  return (
    <div className="flex flex-col gap-4">
      <ErrorText error={events.error} />
      <ol className="divide-y rounded-xl border bg-card">
        {rows.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <Avatar className="size-7 shrink-0">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">{initialsOf(e.actorName ?? "Someone")}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="font-medium">{e.actorName ?? "Someone"}</span> {EVENT_LABEL[e.type] ?? e.type} <code className="text-xs">{e.policyKey}</code>
              {e.toVersion && <span className="text-muted-foreground"> → v{e.toVersion}</span>}
            </span>
            <span className="text-muted-foreground" title={formatDateTime(e.createdAt)}>
              {formatRelative(e.createdAt)}
            </span>
          </li>
        ))}
      </ol>
      {events.hasNextPage && (
        <Button variant="outline" className="self-center" onClick={() => void events.fetchNextPage()}>
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
