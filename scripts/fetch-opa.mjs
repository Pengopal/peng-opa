// Downloads the official OPA binary for this platform into tools/opa/ and verifies its SHA-256.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const OPA_VERSION = "1.11.0";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const exe = process.platform === "win32" ? "opa.exe" : "opa";
const target = join(root, "tools", "opa", exe);

const asset = {
  "win32-x64": "opa_windows_amd64.exe",
  "linux-x64": "opa_linux_amd64_static",
  "linux-arm64": "opa_linux_arm64_static",
  "darwin-x64": "opa_darwin_amd64",
  "darwin-arm64": "opa_darwin_arm64_static",
}[`${process.platform}-${process.arch}`];

if (!asset) throw new Error(`No OPA build for ${process.platform}-${process.arch}`);
if (existsSync(target) && !process.argv.includes("--force")) {
  console.log(`OPA already present at ${target}`);
  process.exit(0);
}

const base = `https://github.com/open-policy-agent/opa/releases/download/v${OPA_VERSION}/${asset}`;
const [bin, sum] = await Promise.all([
  fetch(base).then((r) => { if (!r.ok) throw new Error(`download failed ${r.status}`); return r.arrayBuffer(); }),
  fetch(`${base}.sha256`).then((r) => { if (!r.ok) throw new Error(`checksum download failed ${r.status}`); return r.text(); }),
]);
const expected = sum.trim().split(/\s+/)[0].toLowerCase();
const actual = createHash("sha256").update(Buffer.from(bin)).digest("hex");
if (expected !== actual) throw new Error(`SHA-256 mismatch: expected ${expected}, got ${actual}`);

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, Buffer.from(bin));
if (process.platform !== "win32") chmodSync(target, 0o755);
console.log(`OPA ${OPA_VERSION} saved to ${target} (sha256 ${actual})`);
