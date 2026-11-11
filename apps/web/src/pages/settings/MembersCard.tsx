import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton } from "@/components/CopyButton";
import { ErrorText } from "@/components/ErrorText";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { formatRelative } from "@/lib/format";
import type { Role } from "@/lib/types";
import { InviteDialog, ROLE_LABELS } from "./InviteDialog";

interface MemberRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
}

interface InviteRow {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  inviteUrl: string;
}

/** Members (owners change roles and remove people) and pending invites. */
export function MembersCard({ isOwner }: { isOwner: boolean }) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const members = useQuery({ queryKey: ["members"], queryFn: () => api<MemberRow[]>("/api/members") });
  const invites = useQuery({ queryKey: ["invites"], enabled: isOwner, queryFn: () => api<InviteRow[]>("/api/invites") });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["members"] }), qc.invalidateQueries({ queryKey: ["invites"] })]);
  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => api(`/api/members/${id}`, { method: "PATCH", body: { role } }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/members/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const revokeInvite = useMutation({ mutationFn: (id: string) => api(`/api/invites/${id}`, { method: "DELETE" }), onSuccess: refresh });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Members</h2>
        </CardTitle>
        <CardDescription>Owners manage people and keys, editors publish policies, viewers can look and test.</CardDescription>
        {isOwner && (
          <CardAction>
            <InviteDialog />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ErrorText error={members.error} />
        <ul className="divide-y">
          {members.data?.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {m.name} {m.userId === session?.user.id && <span className="text-muted-foreground">(you)</span>}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{m.email}</span>
              </span>
              {isOwner ? (
                <span className="flex items-center gap-2">
                  <Select value={m.role} onValueChange={(role) => changeRole.mutate({ id: m.id, role: role as Role })}>
                    <SelectTrigger aria-label={`Role of ${m.name}`} size="sm" className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(m.id)}>
                    Remove
                  </Button>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">{ROLE_LABELS[m.role].label}</span>
              )}
            </li>
          ))}
        </ul>
        {isOwner && !!invites.data?.length && (
          <section aria-labelledby="pending-h">
            <h3 id="pending-h" className="mb-2 text-sm font-medium">
              Pending invites
            </h3>
            <ul className="divide-y rounded-lg border">
              {invites.data.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span>
                    {i.email} · {ROLE_LABELS[i.role].label} · <span className="text-muted-foreground">expires {formatRelative(i.expiresAt)}</span>
                  </span>
                  <span className="flex gap-1">
                    <CopyButton text={i.inviteUrl} label="Copy link" />
                    <Button variant="ghost" size="sm" onClick={() => revokeInvite.mutate(i.id)}>
                      Revoke
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
