import { useState, type ReactNode } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, CircleAlert, FlaskConical, Loader2 } from "lucide-react";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorText } from "@/components/ErrorText";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { api } from "@/lib/api";
import type { PolicyDetail, TryResult } from "@/lib/types";
import { can, useWorkspace } from "@/lib/workspace";
import { matchedRuleId } from "./matched-rule";
import { RuleList } from "./RuleList";
import { useDraft, type SaveState } from "./useDraft";

const SAVE_LABEL: Record<SaveState, ReactNode> = {
  saved: (
    <>
      <Check className="size-3.5" aria-hidden /> Saved
    </>
  ),
  saving: (
    <>
      <Loader2 className="size-3.5 animate-spin" aria-hidden /> Saving…
    </>
  ),
  unsaved: "Unsaved changes",
  error: (
    <>
      <CircleAlert className="size-3.5" aria-hidden /> Not saved — retrying on next change
    </>
  ),
};

export interface EditorSlots {
  /** Right column next to the rules (Try-it panel). */
  side?: (ctx: EditorContext) => ReactNode;
  /** Buttons at the top right (Rego view, Publish). */
  actions?: (ctx: EditorContext) => ReactNode;
  /** Other tabs (Versions, Settings). */
  versions?: (ctx: EditorContext) => ReactNode;
  settings?: (ctx: EditorContext) => ReactNode;
}

export type EditorContext = {
  policy: PolicyDetail;
  draft: ReturnType<typeof useDraft>;
  canEdit: boolean;
  /** Re-read the policy and restart the editor from the stored draft (after restore or publish). */
  reload(): Promise<void>;
  /** The last Try-it result, until the draft changes. */
  tryResult: TryResult | null;
  setTryResult(r: TryResult | null): void;
};

function Editor({ policy, slots, reload }: { policy: PolicyDetail; slots: EditorSlots; reload(): Promise<void> }) {
  const { current } = useWorkspace();
  const canEdit = can(current?.role, "EDITOR");
  const draft = useDraft(policy.id, policy.draft);
  const [tab, setTab] = useState("rules");
  const [tryItOpen, setTryItOpen] = useState(false);
  const [run, setRun] = useState<{ result: TryResult | null; id: number; ruleSet?: unknown }>({ result: null, id: 0 });
  const setTryResult = (result: TryResult | null) => setRun((r) => ({ result, id: r.id + 1, ruleSet: draft.ruleSet }));
  // An edit makes the last result stale: the marker would point at a rule that may no longer match.
  const tryResult = run.ruleSet === draft.ruleSet ? run.result : null;
  // Save pending edits before re-reading, so the remount never sends a stale draft over newer server state.
  const ctx: EditorContext = {
    policy,
    draft,
    canEdit,
    reload: async () => {
      await draft.flush();
      await reload();
    },
    tryResult,
    setTryResult,
  };
  const errors = draft.issues.filter((i) => i.severity === "error").length;

  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={[{ label: "Policies", to: "/policies" }, { label: policy.name }]}
        title={policy.name}
        status={
          <span className="flex items-center gap-2">
            <StatusChip status={policy.status} />
            {policy.liveVersion && <span className="text-[13px] text-muted-foreground">v{policy.liveVersion.number}</span>}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-3">
            <code className="font-mono text-[13px]">{policy.key}</code>
            {canEdit && (
              <span role="status" className="inline-flex items-center gap-1">
                {SAVE_LABEL[draft.saveState]}
              </span>
            )}
            {errors > 0 && <span className="text-danger">{errors} issue{errors > 1 ? "s" : ""} to fix</span>}
          </span>
        }
        actions={slots.actions?.(ctx)}
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList variant="line">
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-4 w-full min-w-0">
          <div className="grid gap-8 pb-20 xl:grid-cols-[minmax(0,1fr)_360px] xl:pb-0">
            <RuleList ruleSet={draft.ruleSet} issues={draft.issues} disabled={!canEdit} onChange={draft.setRuleSet} matchedRuleId={matchedRuleId(draft.ruleSet, tryResult)} runId={run.id} />
            <aside className="hidden xl:sticky xl:top-6 xl:block xl:self-start">{slots.side?.(ctx)}</aside>
          </div>
          <Button
            className="fixed inset-x-4 bottom-20 z-30 xl:hidden"
            onClick={() => setTryItOpen(true)}
          >
            <FlaskConical aria-hidden /> Test
          </Button>
          <ResponsiveSheet open={tryItOpen} onOpenChange={setTryItOpen} title="Try it">
            {slots.side?.(ctx)}
          </ResponsiveSheet>
        </TabsContent>
        <TabsContent value="versions" className="mt-4 w-full min-w-0">
          {slots.versions?.(ctx)}
        </TabsContent>
        <TabsContent value="settings" className="mt-4 w-full min-w-0">
          {slots.settings?.(ctx)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** The policy editor page: loads the policy, then the editor keeps its own autosaved draft. */
export function PolicyEditor({ slots = {} }: { slots?: EditorSlots }) {
  const { policyId } = useParams({ strict: false }) as { policyId: string };
  const [epoch, setEpoch] = useState(0);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ["policy", policyId], queryFn: () => api<PolicyDetail>(`/api/policies/${policyId}`) });
  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (error || !data) return <ErrorText error={error ?? new Error("Policy not found")} />;
  const reload = async () => {
    await refetch();
    setEpoch((e) => e + 1);
  };
  return <Editor key={`${data.id}:${epoch}`} policy={data} slots={slots} reload={reload} />;
}
