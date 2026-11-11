/** Same rule as the server: 3–60 lowercase letters, digits or hyphens. */
export const POLICY_KEY_PATTERN = "[a-z0-9-]{3,60}";

/** "Checkout Discount!" → "checkout-discount"; "" when the name is too short to make a key. */
export function deriveKey(name: string): string {
  const key = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return key.length >= 3 ? key : "";
}
