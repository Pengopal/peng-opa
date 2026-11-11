import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const api = "http://localhost:3000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@peng/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)),
    },
  },
  server: { port: 5180, strictPort: true, proxy: { "/api": api, "/v1": api, "/health": api } },
  test: { environment: "jsdom", globals: true, setupFiles: ["src/test/setup.ts"], include: ["src/**/*.spec.{ts,tsx}"] },
});
