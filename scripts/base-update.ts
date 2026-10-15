import { execFileSync, spawnSync } from "node:child_process";
import process from "node:process";
import { parseArgs } from "node:util";

/*
 * Brings the base's updates into a product: merges the remote `base`, keeps deleted what the product
 * deleted on purpose (the samples it replaced), takes the base's side of every generated file and
 * generates it again from the product's own sources, and says what is left for a person to settle.
 * `--since <commit>` first marks a product made by create-next-app as already holding the base up to
 * that commit, which it does once: such a product starts with no history in common with the base.
 */

const { values } = parseArgs({ options: { since: { type: "string" } } });

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
const tryGit = (...args: string[]) => spawnSync("git", args, { encoding: "utf8" });
const run = (command: string, args: string[]) => execFileSync(command, args, { stdio: "inherit" });
const say = (text: string) => process.stdout.write(`${text}\n`);

// Written by `pnpm tokens` and `pnpm messages` from files the product owns; never merged by hand.
const generated = new Set([
  "messages/pt-BR.json",
  "styles/tokens.css",
  "styles/preset.css",
  "styles/print.css",
  "app/fonts.ts",
  "lib/typeface.ts",
  "lib/contrast-choice.ts",
  "lib/accents.ts",
  "lib/palettes.ts",
  "emails/palette.ts",
]);

if (tryGit("remote", "get-url", "base").status !== 0) {
  say(
    "There is no remote `base`. Add it: git remote add base https://github.com/thiagoteles/exata-base.git",
  );
  process.exit(1);
}
if (git("status", "--porcelain") !== "") {
  say("Commit or put away the changes first: the merge needs a clean tree.");
  process.exit(1);
}
// The files `.gitattributes` gives to the product keep its side only with this driver named.
run("git", ["config", "merge.ours.driver", "true"]);
run("git", ["fetch", "base"]);

if (values.since !== undefined) {
  run("git", [
    "merge",
    "-s",
    "ours",
    "--allow-unrelated-histories",
    "-m",
    `chore: the base up to ${values.since.slice(0, 7)} is already here`,
    values.since,
  ]);
}
if (tryGit("merge-base", "HEAD", "base/main").status !== 0) {
  say(
    "This product shares no history with the base yet. Find the base commit it was made from and run\n" +
      "pnpm base:update --since <commit>",
  );
  process.exit(1);
}

const merged = tryGit("merge", "--no-ff", "--no-commit", "base/main");
if (merged.status !== 0 && !merged.stdout.includes("CONFLICT")) {
  say(merged.stdout + merged.stderr);
  process.exit(1);
}

const statusOf = () =>
  git("status", "--porcelain")
    .split("\n")
    .filter((line) => line.length > 3)
    .map((line) => ({ code: line.slice(0, 2), file: line.slice(3) }));

for (const { code, file } of statusOf()) {
  if (code === "DU") {
    // The product deleted it and the base changed it: the product's choice stands.
    run("git", ["rm", "--quiet", file]);
  } else if (code === "UU" && generated.has(file)) {
    run("git", ["checkout", "--theirs", "--", file]);
  }
}
run("pnpm", ["messages"]);
// DESIGN.md holds generated tables between the base's prose; settled by hand, it is generated after.
const designSettled = !statusOf().some(
  ({ code, file }) => file === "DESIGN.md" && code.includes("U"),
);
if (designSettled) {
  run("pnpm", ["tokens"]);
}
run("git", ["add", "--", ...generated, ...(designSettled ? ["DESIGN.md"] : [])]);

const left = statusOf().filter(({ code }) => code.includes("U") || code === "AA" || code === "DD");
if (left.length > 0) {
  say(
    `\nStill to settle by hand, then \`pnpm tokens\` and commit:\n${left.map(({ file }) => `- ${file}`).join("\n")}`,
  );
  process.exit(1);
}
if (
  tryGit("diff", "--cached", "--quiet").status === 0 &&
  merged.stdout.includes("Already up to date")
) {
  say("The product already has everything the base has.");
  process.exit(0);
}
run("git", ["commit", "--no-edit"]);
say("The base's updates are merged. The pre-commit hook ran the check.");
