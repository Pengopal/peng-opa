import { defineConfig } from "vitest/config";
import { sharedConfig } from "./vitest.shared";

export default defineConfig({
  ...sharedConfig,
  test: {
    globals: true,
    include: ["test/**/*.spec.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    setupFiles: ["test/support/load-env.ts"],
  },
});
