import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DecisionSource } from "@/lib/types";

export interface Summary {
  decisionsToday: number;
  allowRateToday: number | null;
  livePolicies: number;
  p95LatencyToday: number | null;
  firstApiCallAt: string | null;
  hasTested: boolean;
  hasPublished: boolean;
}

export interface DayPoint {
  date: string;
  allowed: number;
  denied: number;
}

export interface RecentDecision {
  id: string;
  policyId: string;
  policyName: string;
  allowed: boolean;
  matchedRule: string | null;
  source: DecisionSource;
  createdAt: string;
}

export const useSummary = () => useQuery({ queryKey: ["insights", "summary"], queryFn: () => api<Summary>("/api/insights/summary"), refetchInterval: 15_000 });
export const useDaily = () => useQuery({ queryKey: ["insights", "daily"], queryFn: () => api<DayPoint[]>("/api/insights/daily?days=14"), refetchInterval: 60_000 });
export const useRecent = () => useQuery({ queryKey: ["insights", "recent"], queryFn: () => api<RecentDecision[]>("/api/insights/recent?limit=5"), refetchInterval: 15_000 });
