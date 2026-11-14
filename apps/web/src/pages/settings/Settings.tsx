import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/SettingsSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorText } from "@/components/ErrorText";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { can, useWorkspace } from "@/lib/workspace";
import { DangerZone } from "./DangerZone";
import { DemoControls } from "./DemoControls";
import { MembersCard } from "./MembersCard";

function WorkspaceForm({ name: initial, disabled }: { name: string; disabled: boolean }) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial);
  const save = useMutation({
    mutationFn: () => api("/api/workspaces/current", { method: "PATCH", body: { name: name.trim() } }),
    onSuccess: async () => {
      toast.success("Workspace renamed");
      await qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }
  return (
    <SettingsSection id="general" title="Workspace" description="The name everyone in the workspace sees.">
        <form onSubmit={onSubmit} className="flex max-w-md flex-wrap items-end gap-3">
          <div className="grid min-w-60 flex-1 gap-2">
            <Label htmlFor="ws-name">Name</Label>
            <Input id="ws-name" value={name} disabled={disabled} minLength={2} maxLength={80} required onChange={(e) => setName(e.target.value)} />
          </div>
          {!disabled && (
            <Button type="submit" disabled={save.isPending || name.trim() === initial}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          )}
        </form>
        <ErrorText error={save.error} />
    </SettingsSection>
  );
}

export function Settings() {
  const { current } = useWorkspace();
  if (!current) return null;
  const isOwner = can(current.role, "OWNER");
  return (
    <div className="flex flex-col">
      <PageHeader title="Settings" description={isOwner ? "Your workspace, its members and its demo controls." : "Only owners can change these settings."} />
      <div className="flex max-w-5xl flex-col">
        <WorkspaceForm key={current.id} name={current.name} disabled={!isOwner} />
        <MembersCard isOwner={isOwner} />
        {current.isDemo && isOwner && <DemoControls />}
        {isOwner && <DangerZone />}
      </div>
    </div>
  );
}
