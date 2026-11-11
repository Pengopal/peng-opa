import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorText } from "@/components/ErrorText";
import { api } from "@/lib/api";
import { deriveKey, POLICY_KEY_PATTERN } from "@/lib/keys";
import type { PolicyDetail } from "@/lib/types";

/** New policy: pick Template or Blank; Blank asks for a name and a key (derived, editable). */
export function NewPolicyDialog({ open, onOpenChange, startBlank }: { open: boolean; onOpenChange(open: boolean): void; startBlank?: boolean }) {
  const [blank, setBlank] = useState(!!startBlank);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: () => api<PolicyDetail>("/api/policies", { method: "POST", body: { name: name.trim(), key } }),
    onSuccess: async (p) => {
      await qc.invalidateQueries({ queryKey: ["policies"] });
      onOpenChange(false);
      void navigate({ to: "/policies/$policyId", params: { policyId: p.id } });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setBlank(!!startBlank);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New policy</DialogTitle>
          <DialogDescription>{blank ? "Give it a name. Your systems will call it by its key." : "How would you like to start?"}</DialogDescription>
        </DialogHeader>
        {!blank ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/templates" onClick={() => onOpenChange(false)} className="rounded-lg border p-4 hover:bg-muted/50">
              <LayoutTemplate className="mb-2 size-5 text-primary" aria-hidden />
              <span className="block font-medium">From a template</span>
              <span className="block text-sm text-muted-foreground">Ready-made rules you can adjust.</span>
            </Link>
            <button type="button" onClick={() => setBlank(true)} className="rounded-lg border p-4 text-left hover:bg-muted/50">
              <FilePlus2 className="mb-2 size-5 text-muted-foreground" aria-hidden />
              <span className="block font-medium">Blank</span>
              <span className="block text-sm text-muted-foreground">Start with no rules.</span>
            </button>
          </div>
        ) : (
          <form id="new-policy" onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="policy-name">Name</Label>
              <Input
                id="policy-name"
                value={name}
                autoFocus
                required
                maxLength={120}
                placeholder="Checkout discount"
                onChange={(e) => {
                  setName(e.target.value);
                  if (!keyEdited) setKey(deriveKey(e.target.value));
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="policy-key">Key</Label>
              <Input
                id="policy-key"
                value={key}
                required
                pattern={POLICY_KEY_PATTERN}
                title="3–60 lowercase letters, digits or hyphens"
                className="font-mono"
                onChange={(e) => {
                  setKeyEdited(true);
                  setKey(e.target.value);
                }}
              />
              <p className="text-xs text-muted-foreground">Used in the API URL: /v1/decide/{key || "your-key"}. It can't change after publishing.</p>
            </div>
            <ErrorText error={create.error} />
          </form>
        )}
        {blank && (
          <DialogFooter>
            <Button type="submit" form="new-policy" disabled={create.isPending || !name.trim() || !key}>
              {create.isPending ? "Creating…" : "Create policy"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
