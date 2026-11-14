const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** "2 hours ago", "yesterday", "just now". */
export function formatRelative(date: string | Date): string {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export const formatDateTime = (date: string | Date) =>
  new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export const formatNumber = (n: number) => new Intl.NumberFormat().format(n);

export const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}%`;

/** Month + day for chart axes, e.g. "Nov 3". Dates are UTC days (YYYY-MM-DD). */
export const formatShortDate = (isoDay: string) =>
  new Date(`${isoDay}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
