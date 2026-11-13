import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, LayoutTemplate, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorText } from "@/components/ErrorText";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import type { Workspace } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** The three ways to start: a template (recommended), a blank policy, or the demo workspace. */
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
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-primary/40">
        <CardHeader>
          <LayoutTemplate className="size-6 text-primary" aria-hidden />
          <CardTitle className="flex items-center gap-2">
            <h2>Start from a template</h2>
            <Badge>Recommended</Badge>
          </CardTitle>
          <CardDescription>Pick a ready-made policy — discounts, refunds, access, approvals — and adjust it.</CardDescription>
        </CardHeader>
        <CardFooter className="mt-auto">
          <Button asChild className="w-full">
            <Link to="/templates">Browse templates</Link>
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <FilePlus2 className="size-6 text-muted-foreground" aria-hidden />
          <CardTitle>
            <h2>Start blank</h2>
          </CardTitle>
          <CardDescription>Write your own rules from scratch with the rule builder.</CardDescription>
        </CardHeader>
        <CardFooter className="mt-auto">
          <Button asChild variant="outline" className="w-full">
            <Link to="/policies" search={{ new: "blank" }}>
              New blank policy
            </Link>
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <Sparkles className="size-6 text-muted-foreground" aria-hidden />
          <CardTitle>
            <h2>Explore the demo</h2>
          </CardTitle>
          <CardDescription>A sample store with live policies and two weeks of decisions to look around in.</CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorText error={demo.error} />
        </CardContent>
        <CardFooter className="mt-auto">
          <Button variant="outline" className="w-full" disabled={demo.isPending} onClick={() => demo.mutate()}>
            {demo.isPending ? "Setting up the demo…" : "Explore the demo workspace"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export function Welcome() {
  return (
    <>
      <PageHeader title="Welcome to peng-opa" description="Rules for your business, decided in milliseconds. How would you like to start?" />
      <WelcomeCards />
    </>
  );
}
