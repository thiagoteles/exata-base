/*
 * One file per area, joined into the catalog the app reads. A catalog of thousands of sentences in one
 * file is where merge conflicts and wrong-place edits happen, so the sentences live in
 * `messages/<locale>/<area>.json` (the area is the first segment of every key) and a command joins
 * them into `messages/<locale>.json`, which stays the type of the catalog and the file everything reads.
 */

const AREA_FILE = /^([A-Za-z][A-Za-z0-9]*)\.json$/;

/** The area a file name stands for, or null when the name is not one. */
export function areaOf(fileName: string): string | null {
  return AREA_FILE.exec(fileName)?.[1] ?? null;
}

/**
 * The joined catalog as text: the areas in alphabetical order, so the output does not depend on the
 * order files are listed in, two-space indented with a closing newline.
 */
export function joinAreas(areas: Readonly<Record<string, unknown>>): string {
  const ordered = Object.fromEntries(
    Object.entries(areas).sort(([a], [b]) => Number(a > b) - Number(a < b)),
  );
  return `${JSON.stringify(ordered, null, 2)}\n`;
}
