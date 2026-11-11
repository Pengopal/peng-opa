import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ErrorText } from "@/components/ErrorText";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/format";

interface TrafficStatus {
  on: boolean;
  endsAt: string | null;
}

/** For demo workspaces: live simulated traffic (auto-off after 10 minutes) and reset. */
export function DemoControls() {
  const qc = useQueryClient();
  const traffic = useQuery({ queryKey: ["demo-traffic"], queryFn: () => api<TrafficStatus>("/api/demo/traffic"), refetchInterval: 15_000 });
  const toggle = useMutation({
    mutationFn: (on: boolean) => api<TrafficStatus>("/api/demo/traffic", { method: "POST", body: { on } }),
    onSuccess: (s) => qc.setQueryData(["demo-traffic"], s),
  });
  const reset = useMutation({
    mutationFn: () => api("/api/demo/reset", { method: "POST", body: {} }),
    onSuccess: async () => {
      toast.success("Demo reset to its original state");
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "workspaces" });
    },
  });
  const on = traffic.data?.on ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Demo</h2>
        </CardTitle>
        <CardDescription>Show the product live: send simulated requests, or put everything back the way it started.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Switch id="demo-traffic" checked={on} disabled={toggle.isPending} onCheckedChange={(v) => toggle.mutate(v)} />
          <Label htmlFor="demo-traffic">Simulate traffic (about 1 request a second)</Label>
          {on && traffic.data?.endsAt && <span className="text-sm text-muted-foreground">stops {formatRelative(traffic.data.endsAt)}</span>}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="self-start">
              Reset demo
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset the demo?</AlertDialogTitle>
              <AlertDialogDescription>Policies, versions and decisions go back to the original demo. Members and API keys stay.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => reset.mutate()}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <ErrorText error={toggle.error ?? reset.error} />
      </CardContent>
    </Card>
  );
}
