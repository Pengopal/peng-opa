import { randomInt } from "node:crypto";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** 6 random chars [a-z0-9]; used in OPA package names, so it must stay lowercase alphanumeric. */
export function newShortId(): string {
  let id = "";
  for (let i = 0; i < 6; i++) id += ALPHABET[randomInt(ALPHABET.length)];
  return id;
}
