import { defineConfig } from "vitest/config";
import * as path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@mint/core": path.resolve(__dirname, "packages/core/src/index.ts"),
      "@mint/ingest": path.resolve(__dirname, "packages/ingest/src/index.ts"),
      "@mint/cli": path.resolve(__dirname, "packages/cli/src/index.ts"),
    },
  },
});
