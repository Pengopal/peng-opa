import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { StatusChip } from "@/components/StatusChip";
import { api } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { VersionSummary } from "@/lib/types";
import type { EditorContext } from "./PolicyEditor";
import { VersionCompare } from "./VersionCompare";

/** Every publish, newest first: view/compare, restore as draft, or roll the live version back. */
export function VersionsTab({ policy, canEdit, reload, draft }: EditorContext) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<number | null>(null);
  const [compare, setCompare] = useState<[number, number] | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ["versions", policy.id], queryFn: () => api<VersionSummary[]>(`/api/policies/${policy.id}/versions`) });
  const live = policy.liveVersion?.number;

  const after = async (message: string) => {
    toast.success(message);
    await Promise.all([qc.invalidateQueries({ queryKey: ["versions", policy.id] }), qc.invalidateQueries({ queryKey: ["policies"] })]);
    await reload();
  };
  const rollback = useMutation({
    mutationFn: (n: number) => api<{ version: number }>(`/api/policies/${policy.id}/versions/${n}/rollback`, { method: "POST", body: {} }),
    onSuccess: (r, n) => after(`v${n} is live again as v${r.version}.`),
  });
  const restore = useMutation({
    // Save pending edits first: saved afterwards they would overwrite the restored draft.
    mutationFn: async (n: number) => {
      await draft.flush();
      return api(`/api/policies/${policy.id}/versions/${n}/restore-draft`, { method: "POST", body: {} });
    },
    onSuccess: (_, n) => after(`The draft now matches v${n}. Publish it when you're ready.`),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data?.length) return <EmptyState title="Not published yet" body="Every time you publish, a version is saved here so you can compare and roll back." />;

  return (
    <div className="flex flex-col gap-3">
      <ErrorText error={error ?? rollback.error ?? restore.error} />
      <ol className="divide-y border-y">
        {data.map((v, i) => (
          <li key={v.number} className="flex flex-wrap items-center justify-between gap-3 px-2 py-3">
            <div className="flex min-w-0 items-baseline gap-3">
              <span className="w-8 shrink-0 font-mono text-[13px] font-medium" data-numeric>
                v{v.number}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 text-sm">
                  <span className="truncate">{v.note ?? <span className="text-muted-foreground">No note</span>}</span>
                  {v.number === live && <StatusChip status="LIVE" />}
                </p>
                <p className="text-xs text-muted-foreground">
                  {v.publishedBy ?? "Someone"} ·{" "}
                  <time dateTime={v.publishedAt} title={formatDateTime(v.publishedAt)}>
                    {formatRelative(v.publishedAt)}
                  </time>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {i < data.length - 1 && (
                <Button variant="ghost" size="sm" onClick={() => setCompare([data[i + 1].number, v.number])}>
                  Compare with v{data[i + 1].number}
                </Button>
              )}
              {canEdit && (
                <Button variant="ghost" size="sm" disabled={restore.isPending} onClick={() => restore.mutate(v.number)}>
                  Restore as draft
                </Button>
              )}
              {canEdit && v.number !== live && (
                <Button variant="outline" size="sm" onClick={() => setConfirm(v.number)}>
                  Roll back live to v{v.number}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
      {compare && <VersionCompare policyId={policy.id} from={compare[0]} to={compare[1]} onClose={() => setCompare(null)} />}

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Roll back to v{confirm}?</AlertDialogTitle>
            <AlertDialogDescription>
              v{confirm} becomes live again as v{(data[0]?.number ?? 0) + 1}. Your systems get it immediately. The draft is not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm !== null) rollback.mutate(confirm);
                setConfirm(null);
              }}
            >
              Roll back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
