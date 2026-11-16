// pnpm --filter server tenantry:link <workspace-slug> <tenantry-alias>   (after a build; reads DATABASE_URL)
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "../prisma/prisma.service.js";
import { linkWorkspace } from "./link-workspace.js";

const envFile = join(import.meta.dirname, "..", "..", "..", "..", ".env");
if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);

const [slug, alias] = process.argv.slice(2);
if (!slug || !alias || !process.env.DATABASE_URL) {
  console.error("Usage: pnpm --filter server tenantry:link <workspace-slug> <tenantry-alias>  (needs DATABASE_URL)");
  process.exit(2);
}
const db = createClient(process.env.DATABASE_URL);
try {
  const ws = await linkWorkspace(db, slug, alias);
  console.log(`Linked ${ws.name} (${slug}) to the Tenantry workspace ${alias}.`);
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
