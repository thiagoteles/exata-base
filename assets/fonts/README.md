# Fonts for generated documents

TrueType files read from disk by `lib/documents` when a PDF is made (the PDF library cannot use the
web fonts the pages load). Source Serif 4 is published under the SIL Open Font License 1.1 by Adobe.
A product that wants its own face puts the TTF here and changes the name in `lib/documents/fonts.ts`.
A route that makes a PDF lists this folder in `outputFileTracingIncludes`, or the image ships without it.
