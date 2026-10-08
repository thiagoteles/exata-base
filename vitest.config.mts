import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    // Files written by storage tests stay out of the development folder.
    env: { STORAGE_DIR: ".storage-test" },
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**", "tests/integration/**"],
  },
});
