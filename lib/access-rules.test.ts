import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
 * Every way into the server proves who is calling. A server action and a route handler are public
 * endpoints whatever the screen shows, so a new one that forgets its check is open to anyone; these
 * rules make that a failing test instead of a review finding (security review, 2026-10-28).
 */

function tracked(pattern: RegExp): string[] {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter((file) => pattern.test(file) && existsSync(file));
}

const serverActionFiles = () =>
  tracked(/^(app|features|lib|components)\/.*\.tsx?$/).filter((file) =>
    readFileSync(file, "utf8").startsWith('"use server"'),
  );

// The builders in the actions client: each one checks the caller (role, plan, rate) before the action runs.
const builtAction = /^(actionFor\("(member|staff|admin)"|publicAction\b|limitedPublicAction\()/;
// The admin services trust their caller to have checked the role; only an admin action may reach them.
const adminService = /from "@\/lib\/[^"]*\b(admin|role-change)\b[^"]*"/;

// What a route handler calls to prove its caller: a session, a role, a plan, a shared secret, a token
// or a provider's signature.
const routeGuard =
  /\b(requireUser|requireRole|requireFeature|isAuthorizedCall|handleIngest|apiRoute|apiWrite|readEvent)\(/;
// A route open to anyone says so, and why, where it is written.
const openMarker = /^\/\/ Open to anyone: \S.{10,}$/m;
const handlerExport = /^export (?:const|async function|function) (GET|POST|PUT|PATCH|DELETE)\b/m;

describe("access rules", () => {
  it("builds every server action with the actions client, so none skips the caller check", () => {
    const offenders = serverActionFiles().flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const loose = [...source.matchAll(/^export\s+(?!const\s)(.*)$/gm)].map((m) => m[1] ?? "");
      const unbuilt = [...source.matchAll(/^export const (\w+)\s*=\s*(.*)$/gm)]
        .filter((m) => !builtAction.test(m[2] ?? ""))
        .map((m) => m[1] ?? "");
      return [...loose, ...unbuilt].map((name) => `${file}: ${name}`);
    });
    expect(offenders).toEqual([]);
  });

  it("reaches an admin service only from an action that requires the admin role", () => {
    const offenders = serverActionFiles()
      .filter((file) => adminService.test(readFileSync(file, "utf8")))
      .flatMap((file) =>
        [...readFileSync(file, "utf8").matchAll(/^export const (\w+)\s*=\s*(.*)$/gm)]
          .filter((m) => !(m[2] ?? "").startsWith('actionFor("admin"'))
          .map((m) => `${file}: ${m[1] ?? ""}`),
      );
    expect(offenders).toEqual([]);
  });

  it("checks the caller in every route handler, or says why the route is open to anyone", () => {
    const offenders = tracked(/^app\/.*\/route\.ts$/).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      if (openMarker.test(source)) {
        return [];
      }
      // Each handler is checked on its own: one guarded verb does not cover its neighbours.
      const handlers = source.split(handlerExport).slice(1);
      const verbs = handlers.filter((_, index) => index % 2 === 0);
      const bodies = handlers.filter((_, index) => index % 2 === 1);
      const unguarded = verbs.filter((_, index) => !routeGuard.test(bodies[index] ?? ""));
      return verbs.length === 0
        ? [`${file}: no handler found`]
        : unguarded.map((verb) => `${file}: ${verb}`);
    });
    expect(offenders).toEqual([]);
  });
});
