import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import type { PolicySummary } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";
import { WelcomeCards } from "../onboarding/Welcome";
import { DecisionsChart } from "./DecisionsChart";
import { useDaily, useRecent, useSummary } from "./insights";
import { RecentDecisions } from "./RecentDecisions";
import { SetupChecklist } from "./SetupChecklist";
import { StatTiles } from "./StatTiles";

export function Home() {
  const { current } = useWorkspace();
  const summary = useSummary();
  const daily = useDaily();
  const recent = useRecent();
  const policies = useQuery({ queryKey: ["policies"], queryFn: () => api<PolicySummary[]>("/api/policies") });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Home" description={current ? `How ${current.name}'s policies are doing today.` : undefined} />
      {policies.data?.length === 0 && <WelcomeCards />}
      {summary.data && <SetupChecklist summary={summary.data} />}
      <StatTiles summary={summary.data} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DecisionsChart days={daily.data} />
        </div>
        <RecentDecisions items={recent.data} />
      </div>
    </div>
  );
}
