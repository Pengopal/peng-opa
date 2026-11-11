import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton } from "@/components/CopyButton";
import { ErrorText } from "@/components/ErrorText";
import { api } from "@/lib/api";
import type { Role } from "@/lib/types";

export const ROLE_LABELS: Record<Role, { label: string; hint: string }> = {
  OWNER: { label: "Owner", hint: "Everything, including members, API keys and deleting the workspace" },
  EDITOR: { label: "Editor", hint: "Build, test and publish policies" },
  VIEWER: { label: "Viewer", hint: "Look around and use Try it" },
};

interface InviteResult {
  inviteUrl: string;
  emailSent: boolean;
  email: string;
}

/** Invite by email; without SMTP the link is shown to copy and send yourself. */
export function InviteDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("EDITOR");
  const invite = useMutation({
    mutationFn: () => api<InviteResult>("/api/invites", { method: "POST", body: { email: email.trim(), role } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["invites"] }),
  });
  const close = () => {
    setOpen(false);
    setEmail("");
    invite.reset();
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    invite.mutate();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus aria-hidden /> Invite
      </Button>
      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{invite.data ? "Invite created" : "Invite a teammate"}</DialogTitle>
            <DialogDescription>
              {invite.data
                ? invite.data.emailSent
                  ? `We emailed ${invite.data.email} a link. It works for 7 days.`
                  : "Email isn't set up on this installation, so send this link yourself. It works for 7 days and only for that email address."
                : "They sign in with this email address to join."}
            </DialogDescription>
          </DialogHeader>
          {invite.data ? (
            <div className="flex flex-col gap-3">
              <code className="break-all rounded-md bg-muted p-3 text-sm">{invite.data.inviteUrl}</code>
              <CopyButton text={invite.data.inviteUrl} label="Copy link" />
            </div>
          ) : (
            <form id="invite-form" onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r].label} — {ROLE_LABELS[r].hint}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ErrorText error={invite.error} />
            </form>
          )}
          <DialogFooter>
            {invite.data ? (
              <Button onClick={close}>Done</Button>
            ) : (
              <Button type="submit" form="invite-form" disabled={!email.trim() || invite.isPending}>
                {invite.isPending ? "Sending…" : "Send invite"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
