/** Activity filters as kept in the URL (all strings; empty = not filtered). Dates are YYYY-MM-DD. */
export interface DecisionFilters {
  policyId?: string;
  allowed?: "true" | "false";
  source?: "API" | "PLAYGROUND" | "DEMO";
  from?: string;
  to?: string;
}

export function parseFilters(s: Record<string, unknown>): DecisionFilters & { tab?: "changes" } {
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  // The router parses search values as JSON, so ?allowed=false arrives as a boolean.
  const allowed = s.allowed === true || s.allowed === "true" ? "true" : s.allowed === false || s.allowed === "false" ? "false" : undefined;
  const source = str(s.source);
  return {
    policyId: str(s.policyId),
    allowed,
    source: source === "API" || source === "PLAYGROUND" || source === "DEMO" ? source : undefined,
    from: str(s.from),
    to: str(s.to),
    tab: s.tab === "changes" ? "changes" : undefined,
  };
}

/** Query string for GET /api/decisions; a date range covers whole UTC days. */
export function decisionsQueryString(f: DecisionFilters, cursor?: string): string {
  const q = new URLSearchParams();
  if (f.policyId) q.set("policyId", f.policyId);
  if (f.allowed) q.set("allowed", f.allowed);
  if (f.source) q.set("source", f.source);
  if (f.from) q.set("from", new Date(`${f.from}T00:00:00.000Z`).toISOString());
  if (f.to) q.set("to", new Date(`${f.to}T23:59:59.999Z`).toISOString());
  if (cursor) q.set("cursor", cursor);
  return q.toString();
}
