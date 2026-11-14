import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Rocket } from "lucide-react";
import { toast } from "sonner";
import type { RuleChange } from "@peng/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ErrorText } from "@/components/ErrorText";
import { api } from "@/lib/api";
import type { PublishPreview } from "@/lib/types";
import { ChangeMark } from "./ChangeMark";
import type { EditorContext } from "./PolicyEditor";

const ORDER: RuleChange["kind"][] = ["changed", "added", "removed", "moved"];

/** "2 rules changed, 1 added" */
export function summarizeChanges(changes: RuleChange[]): string {
  if (!changes.length) return "No rule changes";
  const parts = ORDER.flatMap((kind) => {
    const n = changes.filter((c) => c.kind === kind).length;
    return n ? [`${n} ${kind}`] : [];
  });
  const first = parts[0].split(" ");
  parts[0] = `${first[0]} rule${first[0] === "1" ? "" : "s"} ${first[1]}`;
  return parts.join(", ");
}

/** Publish: check issues (errors block, warnings don't), show what changes, optional note. */
export function PublishDialog({ policy, draft, reload }: EditorContext) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const qc = useQueryClient();
  const next = (policy.liveVersion?.number ?? 0) + 1;
  const preview = useQuery({
    queryKey: ["publish-preview", policy.id],
    enabled: open,
    gcTime: 0,
    queryFn: async () => {
      await draft.flush();
      return api<PublishPreview>(`/api/policies/${policy.id}/publish-preview`);
    },
  });
  const publish = useMutation({
    mutationFn: () => api<{ version: number }>(`/api/policies/${policy.id}/publish`, { method: "POST", body: note.trim() ? { note: note.trim() } : {} }),
    onSuccess: async ({ version }) => {
      toast.success(`Published v${version}. It's live now.`);
      setOpen(false);
      setNote("");
      await qc.invalidateQueries({ queryKey: ["policies"] });
      await reload();
    },
  });
  const errors = preview.data?.issues.filter((i) => i.severity === "error") ?? [];
  const warnings = preview.data?.issues.filter((i) => i.severity === "warning") ?? [];

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Rocket aria-hidden /> Publish
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish {policy.name}</DialogTitle>
            <DialogDescription>Your systems get the new rules immediately. You can roll back at any time.</DialogDescription>
          </DialogHeader>
          {preview.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="flex flex-col gap-4">
              {errors.length > 0 && (
                <div className="rounded-md bg-danger-muted px-3 py-2.5 text-sm text-danger">
                  <p className="font-medium">Fix these first:</p>
                  <ul className="mt-1 list-disc pl-5">
                    {errors.map((i) => (
                      <li key={i.path + i.code}>{i.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {warnings.length > 0 && (
                <ul className="list-disc pl-5 text-sm text-warning">
                  {warnings.map((i) => (
                    <li key={i.path + i.code}>{i.message}</li>
                  ))}
                </ul>
              )}
              {preview.data && (
                <div className="text-sm">
                  <p className="font-medium">{summarizeChanges(preview.data.changes)}</p>
                  {preview.data.changes.length > 0 && (
                    <ul className="mt-2 divide-y border-y">
                      {preview.data.changes.map((c) => (
                        <li key={c.ruleId + c.kind} className="flex items-center justify-between gap-3 py-1.5">
                          <span className="min-w-0 truncate">{c.label}</span>
                          <ChangeMark kind={c.kind} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="publish-note">Note (optional)</Label>
                <Textarea id="publish-note" placeholder="What changed and why" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <ErrorText error={preview.error ?? publish.error} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!preview.data || errors.length > 0 || publish.isPending} onClick={() => publish.mutate()}>
              {publish.isPending ? "Publishing…" : `Publish v${next}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
