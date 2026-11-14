import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, LayoutTemplate, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorText } from "@/components/ErrorText";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import type { Workspace } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function Choice({ icon, title, body, action, note }: { icon: ReactNode; title: ReactNode; body: string; action: ReactNode; note?: ReactNode }) {
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-[13px] text-muted-foreground">{body}</p>
        {note}
      </div>
      <div className="shrink-0">{action}</div>
    </li>
  );
}

/** The three ways to start, as one divided list: a template (recommended), the demo workspace, or a blank policy. */
export function WelcomeCards() {
  const { switchTo } = useWorkspace();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const demo = useMutation({
    mutationFn: () => api<Workspace>("/api/demo", { method: "POST", body: {} }),
    onSuccess: async (ws) => {
      await qc.invalidateQueries({ queryKey: ["workspaces"] });
      switchTo(ws.id);
      void navigate({ to: "/home" });
    },
  });

  return (
    <ul className="max-w-2xl divide-y border-y">
      <Choice
        icon={<LayoutTemplate className="size-4" />}
        title={
          <>
            Start from a template <span className="ml-1 text-xs font-normal text-muted-foreground">Recommended</span>
          </>
        }
        body="Pick a ready-made policy — discounts, refunds, access, approvals — and adjust it."
        action={
          <Button asChild size="sm">
            <Link to="/templates">Browse templates</Link>
          </Button>
        }
      />
      <Choice
        icon={<Sparkles className="size-4" />}
        title="Open the demo"
        body="A sample store with live policies and two weeks of decisions to look around in."
        note={<ErrorText error={demo.error} />}
        action={
          <Button variant="outline" size="sm" disabled={demo.isPending} onClick={() => demo.mutate()}>
            {demo.isPending ? "Setting up the demo…" : "Explore the demo workspace"}
          </Button>
        }
      />
      <Choice
        icon={<FilePlus2 className="size-4" />}
        title="Start blank"
        body="Write your own rules from scratch with the rule builder."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/policies" search={{ new: "blank" }}>
              New blank policy
            </Link>
          </Button>
        }
      />
    </ul>
  );
}

export function Welcome() {
  return (
    <>
      <PageHeader title="Welcome to PengOPA" description="Rules for your business, decided in milliseconds. How would you like to start?" />
      <WelcomeCards />
    </>
  );
}
