# Fonts

`faces/` holds the variable TrueType files the pages load (`next/font/local`). `share/` holds a
static cut of each title and text face, which is what the share image can read. Both are the
families of the presets, published under the SIL Open Font License 1.1. A build reads them from
here and does not fetch them.

The PDF face is `SourceSerif4-Regular.ttf` in this folder (the same family, a static file the PDF
library reads by path). A product that wants its own PDF face puts the TTF here and changes the name
in `lib/documents/fonts.ts`. A route that makes a PDF lists this folder in `outputFileTracingIncludes`,
or the image ships without it.
