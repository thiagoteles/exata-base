/*
 * What the product adds to the build. The product owns this file.
 *
 * `tracingIncludes`: files a route reads at run time through a path the tracer cannot follow, by
 * route pattern. A route that makes a PDF lists the face and pdfkit's standard fonts, as the base's
 * receipts do.
 *
 * `diskReaders`: the product's own files that read from disk at run time, each one a reader of
 * files listed in `tracingIncludes`. A guard refuses any other reader, so a file is never missing
 * only in the production image.
 */
export const productTracingIncludes: Readonly<Record<string, readonly string[]>> = {};

export const productDiskReaders: readonly string[] = [];
