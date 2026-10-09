import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    // Files written by storage tests stay out of the development folder.
    env: { STORAGE_DIR: ".storage-test" },
    include: ["**/*.test.{ts,tsx}"],
    // Agent worktrees live under .claude and carry their own node_modules.
    exclude: ["node_modules/**", ".next/**", ".claude/**", "e2e/**", "tests/integration/**"],
    // The pure rules carry the product's math, so they are held to a coverage floor; the rest of
    // the code has no target. `pnpm test`, and so every commit, measures it.
    coverage: {
      provider: "v8",
      // Printed only: a report folder would hold CSS that the token check reads as hand-written color.
      reporter: ["text-summary"],
      include: ["domain/**/*.ts"],
      exclude: ["domain/**/*.test.ts", "domain/clock.ts"],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
