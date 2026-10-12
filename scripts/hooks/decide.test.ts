import { describe, expect, it } from "vitest";
import { hooksSkipped, needsHooks } from "./decide";

describe("git hooks", () => {
  it("are installed in a repository that has none, or has someone else's", () => {
    expect(needsHooks({ insideGit: true, skipped: false, preCommit: null })).toBe(true);
    expect(needsHooks({ insideGit: true, skipped: false, preCommit: "#!/bin/sh\necho hi" })).toBe(
      true,
    );
  });

  it("are left alone when lefthook is there, outside a repository, or when hooks are off", () => {
    expect(needsHooks({ insideGit: true, skipped: false, preCommit: "call_lefthook run" })).toBe(
      false,
    );
    expect(needsHooks({ insideGit: false, skipped: false, preCommit: null })).toBe(false);
    expect(needsHooks({ insideGit: true, skipped: true, preCommit: null })).toBe(false);
  });

  it("are off in the container and in CI", () => {
    expect(hooksSkipped({ CI: "true" })).toBe(true);
    expect(hooksSkipped({ LEFTHOOK: "0" })).toBe(true);
    expect(hooksSkipped({})).toBe(false);
  });
});
