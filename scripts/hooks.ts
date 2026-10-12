import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import { hooksSkipped, needsHooks } from "./hooks/decide";

/* Installs the git hooks when they are missing, so no commit of a product skips the check. */

function gitPath(name: string): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--git-path", name], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const preCommitPath = gitPath("hooks/pre-commit");
const state = {
  insideGit: preCommitPath !== null,
  // biome-ignore lint/style/noProcessEnv: a repository script, outside the app and its environment rules
  skipped: hooksSkipped(process.env),
  preCommit:
    preCommitPath !== null && existsSync(preCommitPath)
      ? readFileSync(preCommitPath, "utf8")
      : null,
};

if (needsHooks(state)) {
  execFileSync("pnpm", ["exec", "lefthook", "install"], { stdio: "pipe" });
  process.stdout.write(
    "Git hooks were missing and are now installed: every commit runs the check.\n",
  );
}
