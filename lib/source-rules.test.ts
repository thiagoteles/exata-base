import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { publicPaths } from "./i18n/public-paths";

/*
 * Rules about the source itself that the linter cannot hold on its own. A Biome suppression
 * comment would silence the clock plugin, so this test is what keeps it without exceptions.
 */

const sourceFile = /\.(ts|tsx|mts)$/;
const pluginSuppression = /biome-ignore(-start|-all)?\s+lint\/plugin/;

function trackedSources(): string[] {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter((file) => sourceFile.test(file));
}

describe("source rules", () => {
  it("never silences the clock and randomness plugin", () => {
    const offenders = trackedSources().filter((file) =>
      pluginSuppression.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("links to a mapped page through its public address, never the route written by hand", () => {
    const routes = Object.keys(publicPaths).join("|");
    const handWritten = new RegExp(`href=(?:"|\\{\\s*["\`])(${routes})["\`?#]`);
    const offenders = trackedSources()
      .filter((file) => !(file.startsWith("e2e/") || file.endsWith(".test.ts")))
      .filter((file) => handWritten.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("times every route handler under its own pattern, except the uptime check", () => {
    const bare = /^export (async )?function (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/m;
    const offenders = trackedSources()
      .filter((file) => file.startsWith("app/") && file.endsWith("/route.ts"))
      .filter((file) => file !== "app/health/route.ts")
      .filter((file) => {
        const pattern = `/${file
          .slice("app/".length, -"/route.ts".length)
          .split("/")
          .filter((segment) => !segment.startsWith("("))
          .join("/")}`;
        const source = readFileSync(file, "utf8");
        const timed = new RegExp(`timedRoute\\(\\s*"${RegExp.escape(pattern)}"`);
        return bare.test(source) || !timed.test(source);
      });
    expect(offenders).toEqual([]);
  });

  it("invalidates by tag, never by path, and caches with use cache, never unstable_cache", () => {
    const forbidden = /\b(revalidatePath|unstable_cache)\b/;
    const offenders = trackedSources()
      .filter((file) => file !== "lib/source-rules.test.ts")
      .filter((file) => forbidden.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
