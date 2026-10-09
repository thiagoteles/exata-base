import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { locales } from "../lib/i18n/locales";

/*
 * Runs after `next build`. Every page must leave the build prerendered, whole or as a static shell
 * with streamed parts, unless its path has a dynamic segment; and every prerendered page must be in
 * the standalone output the image ships. A page that silently turned dynamic, or a file the trace
 * left behind, fails here instead of in production. With more than one language the shell renders
 * per request on purpose, so only the standalone part is checked.
 */

type RouteEntry = { renderingMode?: string };
type PrerenderManifest = {
  routes: Record<string, RouteEntry>;
  dynamicRoutes: Record<string, unknown>;
};

const root = path.resolve(import.meta.dirname, "..");
const build = path.join(root, ".next");
const standaloneApp = path.join(build, "standalone", ".next", "server", "app");
const readJson = <T>(file: string): T => JSON.parse(readFileSync(path.join(build, file), "utf8"));

if (!existsSync(path.join(build, "prerender-manifest.json"))) {
  process.stderr.write("No build found. Run `pnpm build` first.\n");
  process.exit(1);
}

const pages = Object.entries(readJson<Record<string, string>>("app-path-routes-manifest.json"))
  .filter(([source]) => source.endsWith("/page"))
  .map(([, route]) => route);
const manifest = readJson<PrerenderManifest>("prerender-manifest.json");
const perRequestShell = locales.length > 1;
const problems: string[] = [];

if (!existsSync(path.join(build, "standalone", "server.js"))) {
  problems.push('the standalone server is missing: is `output: "standalone"` still set?');
}

for (const page of pages) {
  const prerendered = manifest.routes[page] !== undefined;
  const dynamicSegment = manifest.dynamicRoutes[page] !== undefined;
  if (!(prerendered || dynamicSegment || perRequestShell)) {
    problems.push(`${page}: the page is no longer prerendered`);
  }
  if (prerendered) {
    const html = path.join(standaloneApp, page === "/" ? "index.html" : `${page}.html`);
    if (!existsSync(html)) {
      problems.push(`${page}: prerendered, but its HTML is not in the standalone output`);
    }
  }
}

if (problems.length > 0) {
  process.stderr.write(`Prerender check failed:\n${problems.map((p) => `  ${p}`).join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(
  `Prerender check passed: ${pages.length} pages${perRequestShell ? " (shell per request)" : ""}.\n`,
);
