import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import type { PolicySummary } from "@/lib/types";
import { WelcomeCards } from "../onboarding/Welcome";
import { DecisionsChart } from "./DecisionsChart";
import { useDaily, useRecent, useSummary } from "./insights";
import { RecentDecisions } from "./RecentDecisions";
import { SetupChecklist } from "./SetupChecklist";
import { StatTiles } from "./StatTiles";

export function Home() {
  const summary = useSummary();
  const daily = useDaily();
  const recent = useRecent();
  const policies = useQuery({ queryKey: ["policies"], queryFn: () => api<PolicySummary[]>("/api/policies") });

  return (
    <div>
      <PageHeader title="Home" />
      <div className="flex flex-col gap-6">
      {policies.data?.length === 0 && <WelcomeCards />}
      {summary.data && <SetupChecklist summary={summary.data} />}
      <StatTiles summary={summary.data} days={daily.data} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <DecisionsChart days={daily.data} />
        <RecentDecisions items={recent.data} />
      </div>
      </div>
    </div>
  );
}
