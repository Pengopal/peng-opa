export type RangePreset = "today" | "7d" | "30d" | "all";

export const RANGE_LABEL: Record<RangePreset, string> = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", all: "All time" };

const DAYS_BACK: Record<Exclude<RangePreset, "all">, number> = { today: 0, "7d": 6, "30d": 29 };

/** Start of a preset range, in the viewer's own time zone: "today" begins at local midnight, 7 days includes today. */
export function rangeFor(preset: RangePreset, now: Date): { from?: string; to?: string } {
  if (preset === "all") return {};
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - DAYS_BACK[preset]);
  return { from: from.toISOString() };
}
