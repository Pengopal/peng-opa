import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorText } from "@/components/ErrorText";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";

/** Delete the workspace — only after typing its name. */
export function DangerZone() {
  const { current } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const remove = useMutation({
    mutationFn: () => api("/api/workspaces/current", { method: "DELETE" }),
    onSuccess: async () => {
      setOpen(false);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "workspaces" });
      await qc.invalidateQueries({ queryKey: ["workspaces"] });
      void navigate({ to: "/home" });
    },
  });
  if (!current) return null;

  return (
    <Card className="border-danger/40">
      <CardHeader>
        <CardTitle>
          <h2>Danger zone</h2>
        </CardTitle>
        <CardDescription>Deleting the workspace removes its policies, versions, keys and decision history for everyone. It can't be undone.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete workspace
        </Button>
      </CardContent>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          setTyped("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {current.name}?</DialogTitle>
            <DialogDescription>Every system calling its policies will start getting errors.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="confirm-name">Type {current.name} to confirm</Label>
            <Input id="confirm-name" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </div>
          <ErrorText error={remove.error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={typed !== current.name || remove.isPending} onClick={() => remove.mutate()}>
              {remove.isPending ? "Deleting…" : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
