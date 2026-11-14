import type { RuleSet } from "@peng/shared";

/** Turns the shared "When … → Allow · Discount % 15 · “Reason”" line into a sentence and its quoted reason. */
export function toSentence(line: string): { sentence: string; reason?: string } {
  const [when, result = ""] = line.split(" → ");
  const [verb = "", ...parts] = result.split(" · ");
  const reason = parts.find((p) => p.startsWith("“"));
  const outcomes = parts
    .filter((p) => p !== reason)
    .map((p) => {
      const m = /^(.*) (\S+)$/.exec(p);
      if (!m) return p;
      const [, label, value] = m;
      if (label.endsWith(" %")) return `${value}% ${label.slice(0, -2).toLowerCase()}`;
      if (value === "yes") return label.toLowerCase();
      if (value === "no") return null;
      return `${label.toLowerCase()} ${value}`;
    })
    .filter((p): p is string => p !== null);
  return { sentence: `${when}, ${verb.toLowerCase()}${outcomes.length ? ` with ${outcomes.join(", ")}` : ""}`, reason };
}

/** "Discount %" with 15 reads "Discount" and "15%"; yes/no outcomes read as words; unknown keys stay as sent. */
export function outcomeRow(key: string, v: unknown, defs?: RuleSet["outcomes"]): [string, string] {
  const label = defs?.find((o) => o.key === key)?.label ?? key;
  const value = typeof v === "boolean" ? (v ? "yes" : "no") : String(v);
  return label.endsWith(" %") ? [label.slice(0, -2), `${value}%`] : [label, value];
}
