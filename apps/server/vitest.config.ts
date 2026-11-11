import { defineConfig } from "vitest/config";
import { sharedConfig } from "./vitest.shared.ts";

export default defineConfig({ ...sharedConfig, test: { globals: true, include: ["src/**/*.spec.ts"] } });
