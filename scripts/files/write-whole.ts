import { renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

/**
 * Writes a generated file whole: the content goes to a sibling first and then takes the file's name
 * in one rename. A plain write empties the file before filling it, and a development server watching
 * it can read it in between, empty or cut short.
 */
export function writeWhole(file: string, content: string): void {
  const sibling = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  writeFileSync(sibling, content);
  renameSync(sibling, file);
}
