import { existsSync } from "node:fs";
import { join } from "node:path";

// Load repo-root .env so TEST_DATABASE_URL etc. are available to e2e tests.
const envFile = join(import.meta.dirname, "..", "..", "..", "..", ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);
