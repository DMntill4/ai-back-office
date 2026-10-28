import { defineConfig } from "vitest/config";
import * as path from "node:path";

const rootDir = typeof import.meta.dirname === "string" ? import.meta.dirname : path.resolve(".");

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "vitest": path.resolve(rootDir, "tests/vitest-shim.ts"),
      "@mint/core": path.resolve(rootDir, "packages/core/src/index.ts"),
      "@mint/ingest": path.resolve(rootDir, "packages/ingest/src/index.ts"),
      "@mint/cli": path.resolve(rootDir, "packages/cli/src/index.ts"),
      "@mint/daemon": path.resolve(rootDir, "packages/daemon/src/index.ts"),
      "@mint/notifiers": path.resolve(rootDir, "packages/notifiers/src/index.ts"),
    },
  },
});
