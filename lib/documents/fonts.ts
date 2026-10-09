import { join } from "node:path";
import process from "node:process";
import { Font } from "@react-pdf/renderer";

/*
 * The face PDFs are set in. The library reads a TrueType file by path, so it lives on disk and is
 * not the web font of the pages. The path is built at run time, which the bundler cannot follow, so
 * it is marked to be left alone and the routes that make a PDF declare the folder as traced.
 */

export const documentFont = "DocumentSerif";
const FONT_FILE = "assets/fonts/SourceSerif4-Regular.ttf";

let registered = false;

/** Registers the face once per process. */
export function registerDocumentFont(): void {
  if (registered) {
    return;
  }
  Font.register({
    family: documentFont,
    src: join(/* turbopackIgnore: true */ process.cwd(), FONT_FILE),
  });
  registered = true;
}
