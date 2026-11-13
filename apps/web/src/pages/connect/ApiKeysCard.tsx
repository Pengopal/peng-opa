import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/CopyButton";
import { DataList, type DataColumn } from "@/components/DataList";
import { ErrorText } from "@/components/ErrorText";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/format";

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/** Owners create and revoke keys; a new key is shown once. */
export function ApiKeysCard() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<ApiKeyRow | null>(null);
  const keys = useQuery({ queryKey: ["api-keys"], queryFn: () => api<ApiKeyRow[]>("/api/api-keys") });
  const create = useMutation({
    mutationFn: () => api<{ key: string }>("/api/api-keys", { method: "POST", body: { name: name.trim() } }),
    onSuccess: async (r) => {
      setCreated(r.key);
      setName("");
      await qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api(`/api/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("Key revoked. Calls with it now get 401.");
      await qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
  const closeCreate = () => {
    setCreating(false);
    setCreated(null);
    create.reset();
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  const columns: DataColumn<ApiKeyRow>[] = [
    {
      header: "Name",
      cell: (k) => (
        <span className="flex min-w-0 items-center gap-2">
          <KeyRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {k.name}
        </span>
      ),
    },
    { header: "Key", cell: (k) => <code className="text-xs text-muted-foreground">{k.prefix}…</code> },
    { header: "Last used", cell: (k) => <span className="text-muted-foreground">{k.lastUsedAt ? formatRelative(k.lastUsedAt) : "never used"}</span> },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>API keys</h2>
        </CardTitle>
        <CardDescription>Each system that calls PengOPA gets its own key, so you can revoke one without touching the others.</CardDescription>
        <CardAction>
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden /> New key
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ErrorText error={keys.error ?? revoke.error} />
        {keys.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No keys yet. Create one to start calling your policies.</p>
        ) : (
          <DataList
            label="API keys"
            rows={keys.data ?? []}
            rowKey={(k) => k.id}
            columns={columns}
            rowActions={(k) => (
              <Button variant="ghost" size="sm" onClick={() => setRevoking(k)}>
                Revoke
              </Button>
            )}
            card={{
              title: (k) => k.name,
              meta: (k) => `${k.prefix}… · ${k.lastUsedAt ? `last used ${formatRelative(k.lastUsedAt)}` : "never used"}`,
            }}
          />
        )}
      </CardContent>

      <Dialog open={creating} onOpenChange={(o) => !o && closeCreate()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{created ? "Copy your key now" : "New API key"}</DialogTitle>
            <DialogDescription>{created ? "You won't see this key again. Store it as a secret in the system that will call PengOPA." : "Name it after the system that will use it."}</DialogDescription>
          </DialogHeader>
          {created ? (
            <div className="flex flex-col gap-3">
              <code className="break-all rounded-md bg-muted p-3 text-sm">{created}</code>
              <CopyButton text={created} label="Copy key" />
            </div>
          ) : (
            <form id="new-key" onSubmit={onSubmit} className="grid gap-2">
              <Label htmlFor="key-name">Name</Label>
              <Input id="key-name" placeholder="Checkout service" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <ErrorText error={create.error} />
            </form>
          )}
          <DialogFooter>
            {created ? (
              <Button onClick={closeCreate}>Done</Button>
            ) : (
              <Button type="submit" form="new-key" disabled={!name.trim() || create.isPending}>
                {create.isPending ? "Creating…" : "Create key"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revoking} onOpenChange={(o) => !o && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke “{revoking?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Any system still using it will get 401 invalid_api_key immediately. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (revoking) revoke.mutate(revoking.id);
                setRevoking(null);
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
