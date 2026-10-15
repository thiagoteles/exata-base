import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

/*
 * Fails when the schema changed without a migration, in either stream: the base's tables against
 * the base's migrations, the product's against its own. It runs the generator: if a new migration
 * file appears, the schema had drifted. Everything the generator wrote is put back exactly as it
 * was, so the check leaves no trace, not even over uncommitted work.
 */

const streams = [
  {
    folder: "lib/db/migrations",
    config: "drizzle.base.config.ts",
    command: "pnpm db:generate:base",
  },
  { folder: "lib/db/product-migrations", config: "drizzle.config.ts", command: "pnpm db:generate" },
];

function snapshot(directory: string): Map<string, string> {
  const files = readdirSync(directory, { recursive: true, withFileTypes: true }).filter((entry) =>
    entry.isFile(),
  );
  return new Map(
    files.map((entry) => {
      const file = path.join(entry.parentPath, entry.name);
      return [file, readFileSync(file, "utf8")];
    }),
  );
}

const drifted = streams.filter(({ folder, config }) => {
  const before = snapshot(folder);
  execFileSync("pnpm", ["exec", "drizzle-kit", "generate", "--config", config, "--name", "drift"], {
    stdio: "pipe",
  });
  const after = snapshot(folder);
  const created = [...after.keys()].filter((file) => !before.has(file));
  for (const file of created) {
    rmSync(file);
  }
  for (const [file, content] of before) {
    if (after.get(file) !== content) {
      writeFileSync(file, content);
    }
  }
  return created.length > 0;
});

for (const { command } of drifted) {
  process.stderr.write(`The schema changed without a migration. Run \`${command}\`.\n`);
}
if (drifted.length > 0) {
  process.exit(1);
}
