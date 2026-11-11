import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorText } from "@/components/ErrorText";
import { api } from "@/lib/api";
import { POLICY_KEY_PATTERN } from "@/lib/keys";
import type { EditorContext } from "./PolicyEditor";

/** Name, description, key (locked once published), pause/resume and delete. */
export function PolicySettingsTab({ policy, canEdit, reload }: EditorContext) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(policy.name);
  const [description, setDescription] = useState(policy.description ?? "");
  const [key, setKey] = useState(policy.key);
  const keyLocked = !!policy.liveVersion;
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["policies"] });
    await reload();
  };

  const save = useMutation({
    mutationFn: () => api(`/api/policies/${policy.id}`, { method: "PATCH", body: { name: name.trim(), description: description.trim() || null, ...(keyLocked ? {} : { key }) } }),
    onSuccess: async () => {
      toast.success("Saved");
      await refresh();
    },
  });
  const toggle = useMutation({
    mutationFn: () => api(`/api/policies/${policy.id}/${policy.status === "PAUSED" ? "resume" : "pause"}`, { method: "POST", body: {} }),
    onSuccess: async () => {
      toast.success(policy.status === "PAUSED" ? "Resumed — the policy is live again." : "Paused — calls now get 409 policy_not_live.");
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/api/policies/${policy.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("Policy deleted");
      await qc.invalidateQueries({ queryKey: ["policies"] });
      void navigate({ to: "/policies", search: {} });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Details</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" value={name} disabled={!canEdit} required maxLength={120} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" value={description} disabled={!canEdit} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-key">Key</Label>
              <Input id="p-key" className="font-mono" value={key} disabled={!canEdit || keyLocked} pattern={POLICY_KEY_PATTERN} onChange={(e) => setKey(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                {keyLocked ? "Locked: this policy has been published and your systems call it by this key." : "3–60 lowercase letters, digits or hyphens."}
              </p>
            </div>
            <ErrorText error={save.error} />
            {canEdit && (
              <Button type="submit" className="self-start" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save details"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Availability</h2>
            </CardTitle>
            <CardDescription>
              {policy.status === "PAUSED" ? "Paused: calls get 409 policy_not_live until you resume." : policy.status === "LIVE" ? "Live: your systems can call it." : "Draft: publish it to make it callable."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {policy.status !== "DRAFT" && (
              <Button variant="outline" disabled={toggle.isPending} onClick={() => toggle.mutate()}>
                {policy.status === "PAUSED" ? "Resume" : "Pause"}
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete policy</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {policy.name}?</AlertDialogTitle>
                  <AlertDialogDescription>Calls to {policy.key} will fail with 404. Versions are deleted; past decisions stay in Activity. This can't be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => remove.mutate()}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <ErrorText error={toggle.error ?? remove.error} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
