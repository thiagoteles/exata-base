/*
 * Whether the git hooks still have to be installed. A product made with create-next-app installs
 * its dependencies before `git init`, so lefthook finds no repository and the product starts with
 * no hook at all: commits that never ran the check. The check installs them the first time it runs.
 */

export type HookState = {
  /** The folder is a git repository. */
  insideGit: boolean;
  /** CI is set, or LEFTHOOK is 0: the container and the scheduler skip hooks on purpose. */
  skipped: boolean;
  /** The pre-commit hook's text, or null when there is none. */
  preCommit: string | null;
};

export const needsHooks = ({ insideGit, skipped, preCommit }: HookState): boolean =>
  insideGit && !skipped && (preCommit === null || !preCommit.includes("lefthook"));

export const hooksSkipped = (env: Readonly<Record<string, string | undefined>>): boolean =>
  (env["CI"] ?? "") !== "" || env["LEFTHOOK"] === "0";
