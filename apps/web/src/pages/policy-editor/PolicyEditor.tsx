import { useState, type ReactNode } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, CircleAlert, FlaskConical, Loader2 } from "lucide-react";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorText } from "@/components/ErrorText";
import { StatusChip } from "@/components/StatusChip";
import { api } from "@/lib/api";
import type { PolicyDetail } from "@/lib/types";
import { can, useWorkspace } from "@/lib/workspace";
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
};

function Editor({ policy, slots, reload }: { policy: PolicyDetail; slots: EditorSlots; reload(): Promise<void> }) {
  const { current } = useWorkspace();
  const canEdit = can(current?.role, "EDITOR");
  const draft = useDraft(policy.id, policy.draft);
  const [tab, setTab] = useState("rules");
  const [tryItOpen, setTryItOpen] = useState(false);
  // Save pending edits before re-reading, so the remount never sends a stale draft over newer server state.
  const ctx: EditorContext = {
    policy,
    draft,
    canEdit,
    reload: async () => {
      await draft.flush();
      await reload();
    },
  };
  const errors = draft.issues.filter((i) => i.severity === "error").length;

  return (
    <div className="flex flex-col gap-4">
      <Link to="/policies" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Policies
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{policy.name}</h1>
            <StatusChip status={policy.status} />
            {policy.liveVersion && <span className="text-sm text-muted-foreground">Live v{policy.liveVersion.number}</span>}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <code>{policy.key}</code>
            {canEdit && (
              <span role="status" className="inline-flex items-center gap-1">
                {SAVE_LABEL[draft.saveState]}
              </span>
            )}
            {errors > 0 && <span className="text-danger">{errors} issue{errors > 1 ? "s" : ""} to fix</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">{slots.actions?.(ctx)}</div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-4 w-full min-w-0">
          <div className="grid gap-6 pb-20 xl:grid-cols-[minmax(0,1fr)_360px] xl:pb-0">
            <RuleList ruleSet={draft.ruleSet} issues={draft.issues} disabled={!canEdit} onChange={draft.setRuleSet} />
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
