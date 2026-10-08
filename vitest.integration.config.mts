import { defineConfig } from "vitest/config";

// Integration tests run against real services in containers, so they need Docker.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    fileParallelism: false,
    hookTimeout: 120_000,
  },
});
