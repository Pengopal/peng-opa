import type { Field } from "@peng/shared";

/** Form state: one string per field path, as typed. */
export type FormValues = Record<string, string>;

function convert(field: Field, raw: string): unknown {
  switch (field.type) {
    case "number":
      return Number(raw);
    case "yesno":
      return raw === "true";
    case "list":
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    default:
      return raw;
  }
}

/** Nested decision input from the form: "customer.tier" → { customer: { tier } }; blanks are left out. */
export function buildInput(fields: Field[], values: FormValues): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = values[field.path];
    if (raw === undefined || raw.trim() === "") continue;
    const segs = field.path.split(".");
    let node = input;
    for (const seg of segs.slice(0, -1)) {
      if (typeof node[seg] !== "object" || node[seg] === null) node[seg] = {};
      node = node[seg] as Record<string, unknown>;
    }
    node[segs[segs.length - 1]] = convert(field, raw);
  }
  return input;
}

/** Back from an input object (a sample or a logged decision) to form values. */
export function flattenInput(fields: Field[], input: unknown): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    let v: unknown = input;
    for (const seg of field.path.split(".")) v = v && typeof v === "object" ? (v as Record<string, unknown>)[seg] : undefined;
    if (v === undefined || v === null) continue;
    values[field.path] = Array.isArray(v) ? v.join(", ") : String(v);
  }
  return values;
}
