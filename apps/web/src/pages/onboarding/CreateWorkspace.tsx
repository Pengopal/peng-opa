import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorText } from "@/components/ErrorText";
import { api } from "@/lib/api";
import type { Workspace } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";
import { AuthCard } from "../auth/AuthCard";

/** The one form after sign-up: name the workspace, then go to the Welcome screen. */
export function CreateWorkspace() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { switchTo, list } = useWorkspace();
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: (n: string) => api<Workspace>("/api/workspaces", { method: "POST", body: { name: n } }),
    onSuccess: async (ws) => {
      await qc.invalidateQueries({ queryKey: ["workspaces"] });
      switchTo(ws.id);
      void navigate({ to: "/welcome" });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate(name.trim());
  }

  return (
    <AuthCard
      title={list.length ? "New workspace" : "Name your workspace"}
      description="Usually your company or team name. You can change it later."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="ws-name">Workspace name</Label>
          <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." minLength={2} maxLength={80} required autoFocus />
        </div>
        <ErrorText error={create.error} />
        <Button type="submit" disabled={create.isPending || name.trim().length < 2}>
          {create.isPending ? "Creating…" : "Continue"}
        </Button>
      </form>
    </AuthCard>
  );
}
