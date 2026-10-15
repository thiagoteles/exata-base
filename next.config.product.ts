/*
 * What the product adds to the build. The product owns this file.
 *
 * `tracingIncludes`: files a route reads at run time through a path the tracer cannot follow, by
 * route pattern. A route that makes a PDF lists the face and pdfkit's standard fonts, as the base's
 * receipts do.
 */
export const productTracingIncludes: Readonly<Record<string, readonly string[]>> = {};
