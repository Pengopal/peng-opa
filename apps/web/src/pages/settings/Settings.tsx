import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Workspace</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
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
      </CardContent>
    </Card>
  );
}

export function Settings() {
  const { current } = useWorkspace();
  if (!current) return null;
  const isOwner = can(current.role, "OWNER");
  const sections = [
    { id: "general", label: "General" },
    { id: "members", label: "Members" },
    ...(current.isDemo && isOwner ? [{ id: "demo", label: "Demo" }] : []),
    ...(isOwner ? [{ id: "danger", label: "Danger zone" }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description={isOwner ? "Your workspace, its members and its demo controls." : "Only owners can change these settings."} />
      <div className="grid gap-6 md:grid-cols-[160px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="hidden md:block">
          <ul className="sticky top-6 flex flex-col gap-1">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex max-w-3xl flex-col gap-6">
          <section id="general" className="scroll-mt-20">
            <WorkspaceForm key={current.id} name={current.name} disabled={!isOwner} />
          </section>
          <section id="members" className="scroll-mt-20">
            <MembersCard isOwner={isOwner} />
          </section>
          {current.isDemo && isOwner && (
            <section id="demo" className="scroll-mt-20">
              <DemoControls />
            </section>
          )}
          {isOwner && (
            <section id="danger" className="scroll-mt-20">
              <DangerZone />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
