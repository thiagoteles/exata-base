import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

/*
 * Fails when the schema changed without a migration. It runs the generator: if a new migration
 * file appears, the schema had drifted. Everything the generator wrote is put back exactly as it
 * was, so the check leaves no trace, not even over uncommitted work.
 */

const folder = "lib/db/migrations";

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

const before = snapshot(folder);
execFileSync("pnpm", ["exec", "drizzle-kit", "generate", "--name", "drift"], { stdio: "pipe" });
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

if (created.length > 0) {
  process.stderr.write("The schema changed without a migration. Run `pnpm db:generate`.\n");
  process.exit(1);
}
