import { useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileCheck2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList, type DataColumn } from "@/components/DataList";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { api } from "@/lib/api";
import { formatNumber, formatRelative } from "@/lib/format";
import type { PolicySummary } from "@/lib/types";
import { can, useWorkspace } from "@/lib/workspace";
import { NewPolicyDialog } from "./NewPolicyDialog";

function versionLine(p: PolicySummary) {
  const edited = `edited ${formatRelative(p.updatedAt)}`;
  return p.liveVersion ? `Live v${p.liveVersion.number} · ${edited}` : `Not published · ${edited}`;
}

export function PoliciesList() {
  const { new: startBlank } = useSearch({ strict: false }) as { new?: "blank" };
  const navigate = useNavigate();
  const { current } = useWorkspace();
  const [open, setOpen] = useState(startBlank === "blank");
  const { data, isLoading, error } = useQuery({ queryKey: ["policies"], queryFn: () => api<PolicySummary[]>("/api/policies") });
  const canEdit = can(current?.role, "EDITOR");

  const newButton = canEdit && (
    <Button onClick={() => setOpen(true)}>
      <Plus aria-hidden /> New policy
    </Button>
  );

  const open1 = (p: PolicySummary) => void navigate({ to: "/policies/$policyId", params: { policyId: p.id } });

  const columns: DataColumn<PolicySummary>[] = [
    {
      header: "Policy",
      cell: (p) => (
        <span>
          <Link to="/policies/$policyId" params={{ policyId: p.id }} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
            {p.name}
          </Link>
          <span className="block font-mono text-xs text-muted-foreground">{p.key}</span>
        </span>
      ),
    },
    {
      header: "Status",
      cell: (p) => (
        <span className="flex flex-wrap items-center gap-2">
          <StatusChip status={p.status} />
          {p.liveVersion && p.hasDraftChanges && <span className="text-xs text-muted-foreground">Draft changes</span>}
        </span>
      ),
    },
    { header: "Version", hideBelow: "lg", cell: (p) => <span className="text-sm text-muted-foreground">{versionLine(p)}</span> },
    { header: "Decisions (7 days)", className: "text-right", cell: (p) => <span className="tabular-nums">{formatNumber(p.decisions7d)}</span> },
  ];

  return (
    <>
      <PageHeader title="Policies" description="The rules your systems ask about. Test a draft, then publish it." actions={newButton} />
      <ErrorText error={error} />
      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : !data?.length ? (
        <EmptyState
          icon={<FileCheck2 className="size-8" aria-hidden />}
          title="No policies yet"
          body="Start from a template — most people have a working policy in a few minutes."
          action={
            canEdit && (
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/templates">Browse templates</Link>
                </Button>
                <Button variant="outline" onClick={() => setOpen(true)}>
                  Start blank
                </Button>
              </div>
            )
          }
        />
      ) : (
        <DataList
          label="Policies"
          rows={data}
          rowKey={(p) => p.id}
          columns={columns}
          onOpen={open1}
          card={{
            title: (p) => p.name,
            meta: (p) => versionLine(p),
            trailing: (p) => <StatusChip status={p.status} />,
          }}
        />
      )}
      <NewPolicyDialog
        open={open}
        startBlank={startBlank === "blank"}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o && startBlank) void navigate({ to: "/policies", search: { new: undefined } });
        }}
      />
    </>
  );
}
