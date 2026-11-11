import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Activity as ActivityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DecisionChip } from "@/components/DecisionChip";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { PageHeader } from "@/components/PageHeader";
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

function Decisions({ filters, setFilters }: { filters: DecisionFilters; setFilters(f: DecisionFilters): void }) {
  const [open, setOpen] = useState<string | null>(null);
  const policies = useQuery({ queryKey: ["policies"], queryFn: () => api<PolicySummary[]>("/api/policies") });
  const decisions = useInfiniteQuery({
    queryKey: ["decisions", filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api<Page<DecisionRow>>(`/api/decisions?${decisionsQueryString(filters, pageParam)}`),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const rows = decisions.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect label="Policy" value={filters.policyId} onChange={(policyId) => setFilters({ ...filters, policyId })} options={(policies.data ?? []).map((p) => [p.id, p.name])} />
        <FilterSelect label="Decision" value={filters.allowed} onChange={(v) => setFilters({ ...filters, allowed: v as DecisionFilters["allowed"] })} options={[["true", "Allowed"], ["false", "Denied"]]} />
        <FilterSelect label="Source" value={filters.source} onChange={(v) => setFilters({ ...filters, source: v as DecisionFilters["source"] })} options={[["API", "API"], ["PLAYGROUND", "Try-it"], ["DEMO", "Demo"]]} />
        <div className="grid gap-1.5">
          <Label htmlFor="f-from" className="text-xs text-muted-foreground">
            From
          </Label>
          <Input id="f-from" type="date" className="w-40" value={filters.from ?? ""} onChange={(e) => setFilters({ ...filters, from: e.target.value || undefined })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="f-to" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input id="f-to" type="date" className="w-40" value={filters.to ?? ""} onChange={(e) => setFilters({ ...filters, to: e.target.value || undefined })} />
        </div>
      </div>
      <ErrorText error={decisions.error} />
      {decisions.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<ActivityIcon className="size-8" aria-hidden />} title="No decisions here" body="Decisions appear as soon as a policy is tested or called. Try clearing the filters." />
      ) : (
        <>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead className="hidden md:table-cell">Matched rule</TableHead>
                  <TableHead className="hidden sm:table-cell">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => setOpen(d.id)}>
                    <TableCell className="whitespace-nowrap text-sm" title={formatDateTime(d.createdAt)}>
                      <button type="button" className="text-left hover:underline" onClick={() => setOpen(d.id)}>
                        {formatRelative(d.createdAt)}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{d.policyName}</TableCell>
                    <TableCell>
                      <DecisionChip allowed={d.allowed} />
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{d.matchedRule ?? "—"}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{SOURCE_LABEL[d.source]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <span>
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
        <TabsList>
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
