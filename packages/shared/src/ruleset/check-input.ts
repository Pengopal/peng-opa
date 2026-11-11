import type { FieldType, RuleSet } from "./types.js";
import { isValidDate } from "./validate.js";

export interface InputCheck {
  /** Fields present with the wrong type (e.g. "620" for a number field): the request is rejected. */
  typeErrors: { field: string; expected: FieldType | "object" }[];
  /** Fields absent or null: not an error, conditions on them just don't match. */
  missingFields: string[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const TYPE_OK: Record<FieldType, (v: unknown) => boolean> = {
  text: (v) => typeof v === "string",
  number: (v) => typeof v === "number" && Number.isFinite(v),
  yesno: (v) => typeof v === "boolean",
  date: isValidDate,
  list: Array.isArray,
};

/** Compare a decision input with the policy's fields. Extra input fields are ignored. */
export function checkInput(rs: RuleSet, input: unknown): InputCheck {
  if (!isObject(input)) return { typeErrors: [{ field: "", expected: "object" }], missingFields: [] };
  const result: InputCheck = { typeErrors: [], missingFields: [] };
  for (const field of rs.fields) {
    let value: unknown = input;
    for (const seg of field.path.split(".")) value = isObject(value) ? value[seg] : undefined;
    if (value === undefined || value === null) result.missingFields.push(field.path);
    else if (!TYPE_OK[field.type](value)) result.typeErrors.push({ field: field.path, expected: field.type });
  }
  return result;
}
