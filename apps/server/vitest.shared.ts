import swc from "unplugin-swc";
import { fileURLToPath } from "node:url";

/** Settings shared by unit and e2e configs: SWC for decorators, @peng/shared from source. */
export const sharedConfig = {
  plugins: [swc.vite({ module: { type: "es6" } })],
  resolve: {
    alias: { "@peng/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)) },
  },
};
