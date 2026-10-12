import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { documentColors, documentStyles, renderPdf } from "./pdf";

/*
 * The receipt as a page: a title, the facts as a ledger of label and value, and the QR code that
 * leads to the page confirming it. Every word arrives as a prop, already in the person's language,
 * so this file holds layout only.
 */

type ReceiptLabels = {
  title: string;
  number: string;
  payer: string;
  amount: string;
  date: string;
  method: string;
  verifyTitle: string;
  verifyHelp: string;
};

export type ReceiptInput = {
  labels: ReceiptLabels;
  values: { number: string; payer: string; amount: string; date: string; method: string };
  qrDataUri: string;
  verifyAddress: string;
};

const styles = StyleSheet.create({
  title: { fontSize: 26, color: documentColors.brandInk, marginBottom: 28 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: documentColors.line,
    paddingVertical: 10,
  },
  label: { fontSize: 11, color: documentColors.inkMuted },
  value: { fontSize: 13 },
  verify: { marginTop: 36, flexDirection: "row", gap: 16, alignItems: "center" },
  qr: { width: 96, height: 96 },
  verifyTitle: { fontSize: 12, marginBottom: 4 },
  verifyHelp: { fontSize: 10, color: documentColors.inkMuted, maxWidth: 320, marginBottom: 6 },
  address: { fontSize: 9, color: documentColors.inkMuted },
});

const ADDRESS_LINE = 48;

/** An address has no spaces to break at, so it is cut into lines that fit beside the code. */
const addressLines = (address: string): string[] =>
  Array.from({ length: Math.ceil(address.length / ADDRESS_LINE) }, (_, line) =>
    address.slice(line * ADDRESS_LINE, (line + 1) * ADDRESS_LINE),
  );

export function renderReceipt({ labels, values, qrDataUri, verifyAddress }: ReceiptInput) {
  const rows = [
    [labels.number, values.number],
    [labels.payer, values.payer],
    [labels.amount, values.amount],
    [labels.date, values.date],
    [labels.method, values.method],
  ] as const;
  return renderPdf(
    <Document title={`${labels.title} ${values.number}`}>
      <Page size="A4" style={documentStyles.page}>
        <Text style={styles.title}>{labels.title}</Text>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
        <View style={styles.verify}>
          <Image src={qrDataUri} style={styles.qr} />
          <View>
            <Text style={styles.verifyTitle}>{labels.verifyTitle}</Text>
            <Text style={styles.verifyHelp}>{labels.verifyHelp}</Text>
            {addressLines(verifyAddress).map((line) => (
              <Text key={line} style={styles.address}>
                {line}
              </Text>
            ))}
          </View>
        </View>
      </Page>
    </Document>,
  );
}
