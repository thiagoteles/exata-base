import { type Document, type DocumentProps, renderToBuffer, StyleSheet } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { emailPalette } from "@/emails/palette";
import { documentFont, registerDocumentFont } from "./fonts";

/*
 * The one door to the PDF library. A document is built from react-pdf elements inside this folder
 * and rendered here; nothing else in the app imports the library. Colors are the hex values of the
 * light theme (the same ones e-mails use), because a PDF reads neither CSS variables nor oklch.
 */

export const documentColors = emailPalette;

export const documentStyles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: documentFont,
    color: documentColors.ink,
    backgroundColor: documentColors.surface,
  },
});

/** The bytes of the PDF for a document element. */
export function renderPdf(document: ReactElement<DocumentProps, typeof Document>): Promise<Buffer> {
  registerDocumentFont();
  return renderToBuffer(document);
}
