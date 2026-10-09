import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { presetNames } from "./tokens/preset";

/*
 * The living catalog at every preset. A preset does not switch while the app runs, so each one has
 * to be made real before it can be looked at: this writes it into design.json, regenerates the
 * tokens, restarts the development server so it starts clean, runs the catalog snapshot suite for that preset,
 * and puts design.json and the generated files back as they were, even when something fails or the
 * run is interrupted. The local compose must be up.
 *
 *   pnpm catalog:presets                     compare every preset with its references
 *   pnpm catalog:presets --update            write the references
 *   pnpm catalog:presets --preset=editorial  one preset only
 */

const update = process.argv.includes("--update");
const only = process.argv.find((argument) => argument.startsWith("--preset="))?.split("=")[1];
const HEALTH_URL = "http://localhost:3300/health";
const START_TIMEOUT_MS = 300_000;

const original = readFileSync("design.json", "utf8");
const design = JSON.parse(original) as Record<string, unknown>;

function run(command: string, args: string[], env: Record<string, string> = {}): number {
  // biome-ignore lint/style/noProcessEnv: a repository script, outside the app and its environment rules
  const result = spawnSync(command, args, { stdio: "inherit", env: { ...process.env, ...env } });
  return result.status ?? 1;
}

/** Puts design.json and the generated files back, and the development server with them. */
async function restore() {
  writeFileSync("design.json", original);
  run("pnpm", ["tokens"]);
  // The server would otherwise go on serving the last preset's fonts and styles.
  if (run("docker", ["compose", "restart", "app"]) === 0) {
    await healthy();
  }
}

process.on("SIGINT", async () => {
  await restore();
  process.exit(130);
});

const chosen = only === undefined ? presetNames : presetNames.filter((name) => name === only);
if (chosen.length === 0) {
  process.stderr.write(`No preset called "${only}". They are: ${presetNames.join(", ")}.\n`);
  process.exit(1);
}

async function healthy(): Promise<boolean> {
  const until = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < until) {
    // biome-ignore lint/performance/noAwaitInLoops: polling, one request at a time
    const answer = await fetch(HEALTH_URL).catch(() => null);
    if (answer?.ok === true) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return false;
}

/** Makes one preset real, runs the suite for it and says whether it matched. */
async function visit(preset: string): Promise<boolean> {
  process.stdout.write(`\n== ${preset}\n`);
  // The preset alone, with no swaps of the product's own, so the picture is the preset's.
  writeFileSync("design.json", `${JSON.stringify({ ...design, preset, adjust: {} }, null, 2)}\n`);
  if (run("pnpm", ["tokens"]) !== 0) {
    return false;
  }
  // A fresh server for each preset. One that has recompiled the styles and the fonts of several
  // presets in a row grows until the machine kills it, so each preset gets a process of its own.
  if (run("docker", ["compose", "restart", "app"]) !== 0 || !(await healthy())) {
    return false;
  }
  const args = [
    "exec",
    "playwright",
    "test",
    "e2e/catalog-snapshots.spec.ts",
    "--project=chromium",
  ];
  if (update) {
    args.push("--update-snapshots");
  }
  return run("pnpm", args, { CATALOG_PRESET: preset }) === 0;
}

const failed: string[] = [];
try {
  for (const preset of chosen) {
    // One at a time on purpose: they share one design.json and one development server.
    // biome-ignore lint/performance/noAwaitInLoops: sequential by design
    if (!(await visit(preset))) {
      failed.push(preset);
    }
  }
} finally {
  await restore();
}

if (failed.length > 0) {
  process.stderr.write(`\nPresets that differ or failed: ${failed.join(", ")}.\n`);
  process.exit(1);
}
process.stdout.write("\nEvery preset matches its references.\n");
