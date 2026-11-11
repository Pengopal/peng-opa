import { defineConfig } from "vitest/config";
import { sharedConfig } from "./vitest.shared";

export default defineConfig({ ...sharedConfig, test: { globals: true, include: ["src/**/*.spec.ts"] } });
